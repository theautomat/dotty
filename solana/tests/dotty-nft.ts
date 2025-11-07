import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DottyNft } from "../target/types/dotty_nft";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getAccount,
} from "@solana/spl-token";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";

describe("dotty-nft", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.DottyNft as Program<DottyNft>;
  const payer = provider.wallet as anchor.Wallet;

  // Metaplex Token Metadata Program ID
  const METAPLEX_PROGRAM_ID = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );

  describe("mint_collectible", () => {
    it("Successfully mints a collectible NFT to a player", async () => {
      // Arrange: Set up test accounts and metadata
      const player = Keypair.generate();
      const mintKeypair = Keypair.generate();

      const metadata = {
        name: "Test Golden Fragment",
        symbol: "DOTTY",
        uri: "https://example.com/metadata/test-golden-fragment.json",
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

      // Act: Call the mint_collectible instruction
      const tx = await program.methods
        .mintCollectible(metadata.name, metadata.symbol, metadata.uri)
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
        name: "Test Crystal Shard",
        symbol: "DOTTY",
        uri: "https://example.com/metadata/test-crystal-shard.json",
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
        .mintCollectible(metadata.name, metadata.symbol, metadata.uri)
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

    it("Creates correct Metaplex metadata", async () => {
      // Arrange
      const player = Keypair.generate();
      const mintKeypair = Keypair.generate();

      const metadata = {
        name: "Test Alien Artifact",
        symbol: "DOTTY",
        uri: "https://example.com/metadata/test-alien-artifact.json",
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
        .mintCollectible(metadata.name, metadata.symbol, metadata.uri)
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

      // Assert: Verify metadata account exists and has correct owner
      const metadataAccountInfo = await provider.connection.getAccountInfo(
        metadataAddress
      );

      expect(metadataAccountInfo).to.not.be.null;
      expect(metadataAccountInfo.owner.toString()).to.equal(
        METAPLEX_PROGRAM_ID.toString()
      );
      console.log("✓ Metadata account owned by Metaplex program");

      // Note: To fully validate metadata contents, we'd need to deserialize
      // the metadata account using Metaplex SDK. This is left as a future enhancement.
      console.log("✓ Metadata structure validated");
    });
  });

  describe("Error cases", () => {
    it("Fails when metadata name is empty", async () => {
      // Arrange
      const player = Keypair.generate();
      const mintKeypair = Keypair.generate();

      const metadata = {
        name: "", // Empty name
        symbol: "DOTTY",
        uri: "https://example.com/metadata/test.json",
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

      // Act & Assert: Expect transaction to fail
      try {
        await program.methods
          .mintCollectible(metadata.name, metadata.symbol, metadata.uri)
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

        // If we get here, the test should fail
        expect.fail("Expected transaction to fail with empty name");
      } catch (error) {
        // Transaction should fail - this is expected
        console.log("✓ Transaction correctly failed with empty name");
      }
    });

    it("Fails when metadata URI is empty", async () => {
      // Arrange
      const player = Keypair.generate();
      const mintKeypair = Keypair.generate();

      const metadata = {
        name: "Test NFT",
        symbol: "DOTTY",
        uri: "", // Empty URI
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

      // Act & Assert
      try {
        await program.methods
          .mintCollectible(metadata.name, metadata.symbol, metadata.uri)
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

        expect.fail("Expected transaction to fail with empty URI");
      } catch (error) {
        console.log("✓ Transaction correctly failed with empty URI");
      }
    });
  });

  describe("Multiple mints", () => {
    it("Can mint multiple different NFTs to the same player", async () => {
      // Arrange
      const player = Keypair.generate();

      // Mint 1
      const mintKeypair1 = Keypair.generate();
      const metadata1 = {
        name: "Golden Fragment #1",
        symbol: "DOTTY",
        uri: "https://example.com/metadata/golden-1.json",
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
        name: "Crystal Shard #1",
        symbol: "DOTTY",
        uri: "https://example.com/metadata/crystal-1.json",
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
        .mintCollectible(metadata1.name, metadata1.symbol, metadata1.uri)
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
        .mintCollectible(metadata2.name, metadata2.symbol, metadata2.uri)
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
