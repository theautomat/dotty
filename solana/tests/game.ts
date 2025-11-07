import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Game } from "../target/types/game";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getAccount,
  createMint,
  createAccount,
  mintTo,
} from "@solana/spl-token";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";

describe("game", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Game as Program<Game>;
  const payer = provider.wallet as anchor.Wallet;

  // Metaplex Token Metadata Program ID
  const METAPLEX_PROGRAM_ID = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );

  describe("NFT Minting", () => {
    describe("mint_nft", () => {
      it("Successfully mints an NFT to a player", async () => {
        // Arrange: Set up test accounts and metadata
        const player = Keypair.generate();
        const mintKeypair = Keypair.generate();

        const metadata = {
          name: "Test Collectible",
          symbol: "GAME",
          uri: "https://example.com/metadata/test-collectible.json",
        };

        console.log("Player wallet:", player.publicKey.toString());
        console.log("Mint account:", mintKeypair.publicKey.toString());

        // Derive the player's associated token account
        const playerTokenAccount = await getAssociatedTokenAddress(
          mintKeypair.publicKey,
          player.publicKey
        );

        console.log("Player token account:", playerTokenAccount.toString());

        // Derive the metadata account PDA
        const [metadataAddress] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("metadata"),
            METAPLEX_PROGRAM_ID.toBuffer(),
            mintKeypair.publicKey.toBuffer(),
          ],
          METAPLEX_PROGRAM_ID
        );

        console.log("Metadata account:", metadataAddress.toString());

        // Act: Call the mint_nft instruction
        const tx = await program.methods
          .mintNft(metadata.name, metadata.symbol, metadata.uri)
          .accounts({
            player: player.publicKey,
            payer: payer.publicKey,
            mint: mintKeypair.publicKey,
            tokenAccount: playerTokenAccount,
            metadata: metadataAddress,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            tokenMetadataProgram: METAPLEX_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([mintKeypair])
          .rpc();

        console.log("Transaction signature:", tx);

        // Assert: Verify the mint account was created
        const mintAccount = await provider.connection.getAccountInfo(
          mintKeypair.publicKey
        );
        expect(mintAccount).to.not.be.null;
        console.log("✓ Mint account created");

        // Assert: Verify the token account was created
        const tokenAccount = await provider.connection.getAccountInfo(
          playerTokenAccount
        );
        expect(tokenAccount).to.not.be.null;
        console.log("✓ Token account created");

        // Assert: Verify the metadata account was created
        const metadataAccountInfo = await provider.connection.getAccountInfo(
          metadataAddress
        );
        expect(metadataAccountInfo).to.not.be.null;
        console.log("✓ Metadata account created");
      });

      it("Player receives exactly 1 NFT token", async () => {
        // Arrange
        const player = Keypair.generate();
        const mintKeypair = Keypair.generate();

        const metadata = {
          name: "Test Rare NFT",
          symbol: "GAME",
          uri: "https://example.com/metadata/test-rare.json",
        };

        const playerTokenAccount = await getAssociatedTokenAddress(
          mintKeypair.publicKey,
          player.publicKey
        );

        const [metadataAddress] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("metadata"),
            METAPLEX_PROGRAM_ID.toBuffer(),
            mintKeypair.publicKey.toBuffer(),
          ],
          METAPLEX_PROGRAM_ID
        );

        // Act
        await program.methods
          .mintNft(metadata.name, metadata.symbol, metadata.uri)
          .accounts({
            player: player.publicKey,
            payer: payer.publicKey,
            mint: mintKeypair.publicKey,
            tokenAccount: playerTokenAccount,
            metadata: metadataAddress,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            tokenMetadataProgram: METAPLEX_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([mintKeypair])
          .rpc();

        // Assert: Check token balance
        const tokenAccountInfo = await getAccount(
          provider.connection,
          playerTokenAccount
        );

        expect(tokenAccountInfo.amount.toString()).to.equal("1");
        console.log("✓ Player received exactly 1 NFT token");
      });

      it("Can mint multiple different NFTs to the same player", async () => {
        // Arrange
        const player = Keypair.generate();

        // Mint 1
        const mintKeypair1 = Keypair.generate();
        const metadata1 = {
          name: "Collectible #1",
          symbol: "GAME",
          uri: "https://example.com/metadata/collectible-1.json",
        };

        const playerTokenAccount1 = await getAssociatedTokenAddress(
          mintKeypair1.publicKey,
          player.publicKey
        );

        const [metadataAddress1] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("metadata"),
            METAPLEX_PROGRAM_ID.toBuffer(),
            mintKeypair1.publicKey.toBuffer(),
          ],
          METAPLEX_PROGRAM_ID
        );

        // Mint 2
        const mintKeypair2 = Keypair.generate();
        const metadata2 = {
          name: "Collectible #2",
          symbol: "GAME",
          uri: "https://example.com/metadata/collectible-2.json",
        };

        const playerTokenAccount2 = await getAssociatedTokenAddress(
          mintKeypair2.publicKey,
          player.publicKey
        );

        const [metadataAddress2] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("metadata"),
            METAPLEX_PROGRAM_ID.toBuffer(),
            mintKeypair2.publicKey.toBuffer(),
          ],
          METAPLEX_PROGRAM_ID
        );

        // Act: Mint first NFT
        await program.methods
          .mintNft(metadata1.name, metadata1.symbol, metadata1.uri)
          .accounts({
            player: player.publicKey,
            payer: payer.publicKey,
            mint: mintKeypair1.publicKey,
            tokenAccount: playerTokenAccount1,
            metadata: metadataAddress1,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            tokenMetadataProgram: METAPLEX_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([mintKeypair1])
          .rpc();

        console.log("✓ First NFT minted");

        // Act: Mint second NFT
        await program.methods
          .mintNft(metadata2.name, metadata2.symbol, metadata2.uri)
          .accounts({
            player: player.publicKey,
            payer: payer.publicKey,
            mint: mintKeypair2.publicKey,
            tokenAccount: playerTokenAccount2,
            metadata: metadataAddress2,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            tokenMetadataProgram: METAPLEX_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([mintKeypair2])
          .rpc();

        console.log("✓ Second NFT minted");

        // Assert: Both token accounts exist
        const tokenAccount1 = await getAccount(
          provider.connection,
          playerTokenAccount1
        );
        const tokenAccount2 = await getAccount(
          provider.connection,
          playerTokenAccount2
        );

        expect(tokenAccount1.amount.toString()).to.equal("1");
        expect(tokenAccount2.amount.toString()).to.equal("1");

        console.log("✓ Player successfully owns 2 different NFTs");
      });
    });
  });

  describe("Token Deposit System", () => {
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

    describe("initialize_vault", () => {
      it("Successfully initializes the deposit vault", async () => {
        const tx = await program.methods
          .initializeVault()
          .accounts({
            vault: vaultPda,
            authority: payer.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log("Initialize transaction:", tx);

        // Fetch and verify vault account
        const vaultAccount = await program.account.depositVault.fetch(vaultPda);

        expect(vaultAccount.authority.toString()).to.equal(
          payer.publicKey.toString()
        );
        expect(vaultAccount.totalDeposits.toNumber()).to.equal(0);
        expect(vaultAccount.totalClaims.toNumber()).to.equal(0);
        expect(vaultAccount.bump).to.equal(vaultBump);

        console.log("✓ Vault initialized successfully");
      });
    });

    describe("deposit_for_nft", () => {
      before(async () => {
        // Create a test token (simulating a memecoin)
        player = Keypair.generate();

        // Airdrop SOL to player for fees
        const airdropSig = await provider.connection.requestAirdrop(
          player.publicKey,
          2 * anchor.web3.LAMPORTS_PER_SOL
        );
        await provider.connection.confirmTransaction(airdropSig);

        // Create token mint (6 decimals like USDC)
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
          vaultPda
        );

        // Mint 10,000 tokens to player (10,000 * 10^6)
        await mintTo(
          provider.connection,
          payer.payer,
          tokenMint,
          playerTokenAccount,
          payer.publicKey,
          10_000_000_000
        );

        console.log("✓ Test setup complete");
      });

      it("Successfully deposits tokens and creates deposit record", async () => {
        const depositAmount = 500_000_000; // 500 tokens
        const timestamp = Math.floor(Date.now() / 1000);

        // Derive deposit record PDA
        const [depositRecordPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("deposit"),
            player.publicKey.toBuffer(),
            Buffer.from(new Uint8Array(new BigInt64Array([BigInt(timestamp)]).buffer)),
          ],
          program.programId
        );

        // Get initial balances
        const initialPlayerBalance = (
          await getAccount(provider.connection, playerTokenAccount)
        ).amount;
        const initialVaultBalance = (
          await getAccount(provider.connection, vaultTokenAccount)
        ).amount;

        // Act: Make deposit
        const tx = await program.methods
          .depositForNft(new anchor.BN(depositAmount))
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

        // Assert: Check balances changed correctly
        const finalPlayerBalance = (
          await getAccount(provider.connection, playerTokenAccount)
        ).amount;
        const finalVaultBalance = (
          await getAccount(provider.connection, vaultTokenAccount)
        ).amount;

        expect(finalPlayerBalance.toString()).to.equal(
          (initialPlayerBalance - BigInt(depositAmount)).toString()
        );
        expect(finalVaultBalance.toString()).to.equal(
          (initialVaultBalance + BigInt(depositAmount)).toString()
        );

        console.log("✓ Tokens transferred correctly");

        // Assert: Check deposit record
        const depositRecord = await program.account.depositRecord.fetch(
          depositRecordPda
        );

        expect(depositRecord.player.toString()).to.equal(
          player.publicKey.toString()
        );
        expect(depositRecord.amount.toNumber()).to.equal(depositAmount);
        expect(depositRecord.claimed).to.be.false;
        expect(depositRecord.tier).to.equal(2); // 500 tokens = tier 2

        console.log("✓ Deposit record created correctly");
      });

      it("Fails when deposit amount is below minimum", async () => {
        const depositAmount = 50_000_000; // 50 tokens (below 100 minimum)
        const timestamp = Math.floor(Date.now() / 1000);

        const [depositRecordPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("deposit"),
            player.publicKey.toBuffer(),
            Buffer.from(new Uint8Array(new BigInt64Array([BigInt(timestamp)]).buffer)),
          ],
          program.programId
        );

        try {
          await program.methods
            .depositForNft(new anchor.BN(depositAmount))
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

          expect.fail("Expected transaction to fail with insufficient deposit");
        } catch (error) {
          console.log("✓ Transaction correctly failed with insufficient deposit");
        }
      });
    });

    describe("claim_deposit", () => {
      let depositRecordPda: PublicKey;

      before(async () => {
        // Make a deposit first
        const depositAmount = 1_000_000_000; // 1,000 tokens
        const timestamp = Math.floor(Date.now() / 1000);

        [depositRecordPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("deposit"),
            player.publicKey.toBuffer(),
            Buffer.from(new Uint8Array(new BigInt64Array([BigInt(timestamp)]).buffer)),
          ],
          program.programId
        );

        await program.methods
          .depositForNft(new anchor.BN(depositAmount))
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

        console.log("✓ Test deposit created");
      });

      it("Successfully claims a deposit", async () => {
        // Act: Claim the deposit
        const tx = await program.methods
          .claimDeposit()
          .accounts({
            player: player.publicKey,
            depositRecord: depositRecordPda,
            vault: vaultPda,
          })
          .signers([player])
          .rpc();

        console.log("Claim transaction:", tx);

        // Assert: Check deposit record is marked as claimed
        const depositRecord = await program.account.depositRecord.fetch(
          depositRecordPda
        );

        expect(depositRecord.claimed).to.be.true;
        console.log("✓ Deposit marked as claimed");

        // Assert: Check vault stats updated
        const vaultAccount = await program.account.depositVault.fetch(vaultPda);
        expect(vaultAccount.totalClaims.toNumber()).to.be.greaterThan(0);
        console.log("✓ Vault stats updated");
      });

      it("Fails when trying to claim already claimed deposit", async () => {
        try {
          await program.methods
            .claimDeposit()
            .accounts({
              player: player.publicKey,
              depositRecord: depositRecordPda,
              vault: vaultPda,
            })
            .signers([player])
            .rpc();

          expect.fail("Expected transaction to fail with already claimed");
        } catch (error) {
          console.log("✓ Transaction correctly failed on double claim");
        }
      });
    });
  });
});
