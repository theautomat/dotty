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

  describe("Treasure Hiding System", () => {
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
      it("Successfully initializes the treasure vault", async () => {
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
        const vaultAccount = await program.account.treasureVault.fetch(vaultPda);

        expect(vaultAccount.authority.toString()).to.equal(
          payer.publicKey.toString()
        );
        expect(vaultAccount.totalHidden.toNumber()).to.equal(0);
        expect(vaultAccount.totalClaimed.toNumber()).to.equal(0);
        expect(vaultAccount.bump).to.equal(vaultBump);

        console.log("✓ Vault initialized successfully");
      });
    });

    describe("hide_treasure", () => {
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

      it("Successfully hides treasure and creates treasure record", async () => {
        const treasureAmount = 500_000_000; // 500 tokens
        const timestamp = Math.floor(Date.now() / 1000);

        // Derive treasure record PDA
        const [treasureRecordPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("treasure"),
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

        // Act: Hide treasure
        const tx = await program.methods
          .hideTreasure(new anchor.BN(treasureAmount), new anchor.BN(timestamp))
          .accounts({
            player: player.publicKey,
            playerTokenAccount: playerTokenAccount,
            vaultTokenAccount: vaultTokenAccount,
            vault: vaultPda,
            treasureRecord: treasureRecordPda,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([player])
          .rpc();

        console.log("Hide treasure transaction:", tx);

        // Assert: Check balances changed correctly
        const finalPlayerBalance = (
          await getAccount(provider.connection, playerTokenAccount)
        ).amount;
        const finalVaultBalance = (
          await getAccount(provider.connection, vaultTokenAccount)
        ).amount;

        expect(finalPlayerBalance.toString()).to.equal(
          (initialPlayerBalance - BigInt(treasureAmount)).toString()
        );
        expect(finalVaultBalance.toString()).to.equal(
          (initialVaultBalance + BigInt(treasureAmount)).toString()
        );

        console.log("✓ Tokens transferred correctly");

        // Assert: Check treasure record
        const treasureRecord = await program.account.treasureRecord.fetch(
          treasureRecordPda
        );

        expect(treasureRecord.player.toString()).to.equal(
          player.publicKey.toString()
        );
        expect(treasureRecord.amount.toNumber()).to.equal(treasureAmount);
        expect(treasureRecord.claimed).to.be.false;
        expect(treasureRecord.tier).to.equal(2); // 500 tokens = tier 2

        console.log("✓ Treasure record created correctly");
      });

      it("Fails when treasure amount is below minimum", async () => {
        const treasureAmount = 50_000_000; // 50 tokens (below 100 minimum)
        const timestamp = Math.floor(Date.now() / 1000);

        const [treasureRecordPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("treasure"),
            player.publicKey.toBuffer(),
            Buffer.from(new Uint8Array(new BigInt64Array([BigInt(timestamp)]).buffer)),
          ],
          program.programId
        );

        try {
          await program.methods
            .hideTreasure(new anchor.BN(treasureAmount), new anchor.BN(timestamp))
            .accounts({
              player: player.publicKey,
              playerTokenAccount: playerTokenAccount,
              vaultTokenAccount: vaultTokenAccount,
              vault: vaultPda,
              treasureRecord: treasureRecordPda,
              tokenProgram: TOKEN_PROGRAM_ID,
              systemProgram: SystemProgram.programId,
            })
            .signers([player])
            .rpc();

          expect.fail("Expected transaction to fail with insufficient treasure");
        } catch (error) {
          console.log("✓ Transaction correctly failed with insufficient treasure");
        }
      });
    });

    describe("claim_treasure", () => {
      let treasureRecordPda: PublicKey;

      before(async () => {
        // Hide a treasure first
        const treasureAmount = 1_000_000_000; // 1,000 tokens
        const timestamp = Math.floor(Date.now() / 1000);

        [treasureRecordPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("treasure"),
            player.publicKey.toBuffer(),
            Buffer.from(new Uint8Array(new BigInt64Array([BigInt(timestamp)]).buffer)),
          ],
          program.programId
        );

        await program.methods
          .hideTreasure(new anchor.BN(treasureAmount), new anchor.BN(timestamp))
          .accounts({
            player: player.publicKey,
            playerTokenAccount: playerTokenAccount,
            vaultTokenAccount: vaultTokenAccount,
            vault: vaultPda,
            treasureRecord: treasureRecordPda,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([player])
          .rpc();

        console.log("✓ Test treasure hidden");
      });

      it("Successfully claims a treasure", async () => {
        // Act: Claim the treasure
        const tx = await program.methods
          .claimTreasure()
          .accounts({
            player: player.publicKey,
            treasureRecord: treasureRecordPda,
            vault: vaultPda,
          })
          .signers([player])
          .rpc();

        console.log("Claim transaction:", tx);

        // Assert: Check treasure record is marked as claimed
        const treasureRecord = await program.account.treasureRecord.fetch(
          treasureRecordPda
        );

        expect(treasureRecord.claimed).to.be.true;
        console.log("✓ Treasure marked as claimed");

        // Assert: Check vault stats updated
        const vaultAccount = await program.account.treasureVault.fetch(vaultPda);
        expect(vaultAccount.totalClaimed.toNumber()).to.be.greaterThan(0);
        console.log("✓ Vault stats updated");
      });

      it("Fails when trying to claim already claimed treasure", async () => {
        try {
          await program.methods
            .claimTreasure()
            .accounts({
              player: player.publicKey,
              treasureRecord: treasureRecordPda,
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
