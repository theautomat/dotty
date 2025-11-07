import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TreasureDeposit } from "../target/types/treasure_deposit";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";

describe("treasure-deposit", () => {
  // Configure the client
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.TreasureDeposit as Program<TreasureDeposit>;
  const payer = provider.wallet as anchor.Wallet;

  // Test accounts
  let vaultPda: PublicKey;
  let vaultBump: number;

  let tokenMint: PublicKey;
  let playerTokenAccount: PublicKey;
  let vaultTokenAccount: PublicKey;

  let player: Keypair;

  before(async () => {
    // Derive vault PDA
    [vaultPda, vaultBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],
      program.programId
    );

    console.log("Vault PDA:", vaultPda.toString());
  });

  describe("initialize", () => {
    it("Successfully initializes the treasure vault", async () => {
      const tx = await program.methods
        .initialize()
        .accounts({
          vault: vaultPda,
          authority: payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Initialize transaction:", tx);

      // Fetch and verify vault account
      const vaultAccount = await program.account.treasureVault.fetch(vaultPda);

      expect(vaultAccount.authority.toString()).to.equal(
        payer.publicKey.toString()
      );
      expect(vaultAccount.totalDeposits.toNumber()).to.equal(0);
      expect(vaultAccount.totalMonstersMinted.toNumber()).to.equal(0);
      expect(vaultAccount.bump).to.equal(vaultBump);

      console.log("✓ Vault initialized successfully");
    });
  });

  describe("deposit_for_monster", () => {
    before(async () => {
      // Create a test memecoin (fake PEPE)
      player = Keypair.generate();

      // Airdrop SOL to player for fees
      const airdropSig = await provider.connection.requestAirdrop(
        player.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);

      // Create token mint (6 decimals like USDC/PEPE)
      tokenMint = await createMint(
        provider.connection,
        payer.payer,
        payer.publicKey, // mint authority
        null, // freeze authority
        6 // decimals
      );

      console.log("Created test token mint:", tokenMint.toString());

      // Create player's token account
      playerTokenAccount = await createAccount(
        provider.connection,
        payer.payer,
        tokenMint,
        player.publicKey
      );

      // Create vault's token account
      vaultTokenAccount = await createAccount(
        provider.connection,
        payer.payer,
        tokenMint,
        vaultPda,
        undefined,
        undefined,
        TOKEN_PROGRAM_ID
      );

      // Mint 1000 tokens to player (1000 * 10^6)
      await mintTo(
        provider.connection,
        payer.payer,
        tokenMint,
        playerTokenAccount,
        payer.publicKey,
        1000_000_000
      );

      console.log("✓ Test setup complete");
    });

    it("Allows player to deposit tokens for a monster", async () => {
      const depositAmount = 100_000_000; // 100 tokens

      // Get player's token balance before
      const playerAccountBefore = await getAccount(
        provider.connection,
        playerTokenAccount
      );
      const playerBalanceBefore = playerAccountBefore.amount;

      // Derive deposit record PDA
      const timestamp = Math.floor(Date.now() / 1000);
      const [depositRecordPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("deposit"),
          player.publicKey.toBuffer(),
          Buffer.from(new anchor.BN(timestamp).toArray("le", 8)),
        ],
        program.programId
      );

      // Deposit tokens
      const tx = await program.methods
        .depositForMonster(new anchor.BN(depositAmount))
        .accounts({
          player: player.publicKey,
          playerTokenAccount: playerTokenAccount,
          vaultTokenAccount: vaultTokenAccount,
          vault: vaultPda,
          depositRecord: depositRecordPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([player])
        .rpc();

      console.log("Deposit transaction:", tx);

      // Verify player's token balance decreased
      const playerAccountAfter = await getAccount(
        provider.connection,
        playerTokenAccount
      );
      const playerBalanceAfter = playerAccountAfter.amount;

      expect(playerBalanceAfter.toString()).to.equal(
        (playerBalanceBefore - BigInt(depositAmount)).toString()
      );

      // Verify vault received tokens
      const vaultAccount = await getAccount(
        provider.connection,
        vaultTokenAccount
      );
      expect(vaultAccount.amount.toString()).to.equal(depositAmount.toString());

      // Verify deposit record was created
      const depositRecord = await program.account.depositRecord.fetch(
        depositRecordPda
      );

      expect(depositRecord.player.toString()).to.equal(
        player.publicKey.toString()
      );
      expect(depositRecord.amount.toNumber()).to.equal(depositAmount);
      expect(depositRecord.claimed).to.be.false;
      expect(depositRecord.monsterType).to.be.oneOf([0, 1, 2, 3, 4]);

      console.log("✓ Deposit successful");
      console.log("  Monster type:", depositRecord.monsterType);
    });

    it("Fails when deposit amount is too low", async () => {
      const lowAmount = 50_000_000; // Only 50 tokens (below 100 minimum)

      const timestamp = Math.floor(Date.now() / 1000) + 1; // Different timestamp
      const [depositRecordPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("deposit"),
          player.publicKey.toBuffer(),
          Buffer.from(new anchor.BN(timestamp).toArray("le", 8)),
        ],
        program.programId
      );

      try {
        await program.methods
          .depositForMonster(new anchor.BN(lowAmount))
          .accounts({
            player: player.publicKey,
            playerTokenAccount: playerTokenAccount,
            vaultTokenAccount: vaultTokenAccount,
            vault: vaultPda,
            depositRecord: depositRecordPda,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([player])
          .rpc();

        expect.fail("Should have failed with InsufficientDeposit");
      } catch (error) {
        expect(error.toString()).to.include("InsufficientDeposit");
        console.log("✓ Correctly rejected low deposit amount");
      }
    });
  });

  describe("claim_monster", () => {
    let depositRecordPda: PublicKey;

    before(async () => {
      // Create another deposit to claim
      const depositAmount = 200_000_000; // 200 tokens

      const timestamp = Math.floor(Date.now() / 1000) + 100;
      [depositRecordPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("deposit"),
          player.publicKey.toBuffer(),
          Buffer.from(new anchor.BN(timestamp).toArray("le", 8)),
        ],
        program.programId
      );

      await program.methods
        .depositForMonster(new anchor.BN(depositAmount))
        .accounts({
          player: player.publicKey,
          playerTokenAccount: playerTokenAccount,
          vaultTokenAccount: vaultTokenAccount,
          vault: vaultPda,
          depositRecord: depositRecordPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([player])
        .rpc();

      console.log("✓ Created deposit for claim test");
    });

    it("Allows player to claim their monster NFT", async () => {
      // Get vault stats before
      const vaultBefore = await program.account.treasureVault.fetch(vaultPda);
      const monstersMintedBefore = vaultBefore.totalMonstersMinted.toNumber();

      // Claim monster
      const tx = await program.methods
        .claimMonster()
        .accounts({
          player: player.publicKey,
          depositRecord: depositRecordPda,
          vault: vaultPda,
        })
        .signers([player])
        .rpc();

      console.log("Claim transaction:", tx);

      // Verify deposit is marked as claimed
      const depositRecord = await program.account.depositRecord.fetch(
        depositRecordPda
      );
      expect(depositRecord.claimed).to.be.true;

      // Verify vault stats updated
      const vaultAfter = await program.account.treasureVault.fetch(vaultPda);
      expect(vaultAfter.totalMonstersMinted.toNumber()).to.equal(
        monstersMintedBefore + 1
      );

      console.log("✓ Monster claimed successfully");
      console.log("  Total monsters minted:", vaultAfter.totalMonstersMinted.toNumber());
    });

    it("Fails when trying to claim twice", async () => {
      try {
        await program.methods
          .claimMonster()
          .accounts({
            player: player.publicKey,
            depositRecord: depositRecordPda,
            vault: vaultPda,
          })
          .signers([player])
          .rpc();

        expect.fail("Should have failed with AlreadyClaimed");
      } catch (error) {
        expect(error.toString()).to.include("AlreadyClaimed");
        console.log("✓ Correctly prevented double-claim");
      }
    });
  });

  describe("whitelist_token", () => {
    let newTokenMint: PublicKey;

    before(async () => {
      // Create a new token mint to whitelist
      newTokenMint = await createMint(
        provider.connection,
        payer.payer,
        payer.publicKey,
        null,
        6
      );
    });

    it("Admin can whitelist a new token", async () => {
      const [whitelistPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("whitelist"), newTokenMint.toBuffer()],
        program.programId
      );

      const tx = await program.methods
        .whitelistToken(newTokenMint)
        .accounts({
          whitelist: whitelistPda,
          tokenMint: newTokenMint,
          vault: vaultPda,
          authority: payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Whitelist transaction:", tx);

      // Verify whitelist entry created
      const whitelistEntry = await program.account.tokenWhitelist.fetch(
        whitelistPda
      );

      expect(whitelistEntry.tokenMint.toString()).to.equal(
        newTokenMint.toString()
      );
      expect(whitelistEntry.enabled).to.be.true;

      console.log("✓ Token whitelisted successfully");
    });

    it("Non-admin cannot whitelist tokens", async () => {
      const unauthorizedUser = Keypair.generate();

      // Airdrop to pay for transaction
      const airdropSig = await provider.connection.requestAirdrop(
        unauthorizedUser.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);

      const anotherTokenMint = await createMint(
        provider.connection,
        payer.payer,
        payer.publicKey,
        null,
        6
      );

      const [whitelistPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("whitelist"), anotherTokenMint.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .whitelistToken(anotherTokenMint)
          .accounts({
            whitelist: whitelistPda,
            tokenMint: anotherTokenMint,
            vault: vaultPda,
            authority: unauthorizedUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([unauthorizedUser])
          .rpc();

        expect.fail("Should have failed with Unauthorized");
      } catch (error) {
        expect(error.toString()).to.include("Unauthorized");
        console.log("✓ Correctly prevented unauthorized whitelist");
      }
    });
  });

  describe("Integration: Full deposit-to-claim flow", () => {
    it("Complete flow: deposit → claim → verify stats", async () => {
      const newPlayer = Keypair.generate();

      // Setup new player
      const airdropSig = await provider.connection.requestAirdrop(
        newPlayer.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);

      const newPlayerTokenAccount = await createAccount(
        provider.connection,
        payer.payer,
        tokenMint,
        newPlayer.publicKey
      );

      await mintTo(
        provider.connection,
        payer.payer,
        tokenMint,
        newPlayerTokenAccount,
        payer.publicKey,
        500_000_000 // 500 tokens
      );

      console.log("✓ New player setup complete");

      // Step 1: Deposit
      const depositAmount = 300_000_000; // 300 tokens
      const timestamp = Math.floor(Date.now() / 1000) + 200;

      const [depositRecordPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("deposit"),
          newPlayer.publicKey.toBuffer(),
          Buffer.from(new anchor.BN(timestamp).toArray("le", 8)),
        ],
        program.programId
      );

      await program.methods
        .depositForMonster(new anchor.BN(depositAmount))
        .accounts({
          player: newPlayer.publicKey,
          playerTokenAccount: newPlayerTokenAccount,
          vaultTokenAccount: vaultTokenAccount,
          vault: vaultPda,
          depositRecord: depositRecordPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([newPlayer])
        .rpc();

      console.log("✓ Step 1: Deposited tokens");

      // Step 2: Claim monster
      await program.methods
        .claimMonster()
        .accounts({
          player: newPlayer.publicKey,
          depositRecord: depositRecordPda,
          vault: vaultPda,
        })
        .signers([newPlayer])
        .rpc();

      console.log("✓ Step 2: Claimed monster");

      // Step 3: Verify final state
      const finalDeposit = await program.account.depositRecord.fetch(
        depositRecordPda
      );
      const finalVault = await program.account.treasureVault.fetch(vaultPda);

      expect(finalDeposit.claimed).to.be.true;
      expect(finalVault.totalDeposits.toNumber()).to.be.greaterThan(0);
      expect(finalVault.totalMonstersMinted.toNumber()).to.be.greaterThan(0);

      console.log("✓ Integration test complete");
      console.log("  Total deposits:", finalVault.totalDeposits.toNumber());
      console.log("  Total monsters:", finalVault.totalMonstersMinted.toNumber());
    });
  });
});
