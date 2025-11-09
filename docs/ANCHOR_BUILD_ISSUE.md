# Anchor Build Issue - Resolved & Remaining

## UPDATE: Anchor CLI Installation - SOLVED ✅

**The Solution (from GitHub issue #3126):**
Install Anchor CLI 0.30.1 WITHOUT the `--locked` flag:
```bash
cargo install --git https://github.com/coral-xyz/anchor --tag v0.30.1 anchor-cli --force
```

The `--locked` flag forced outdated dependencies (time crate v0.3.29) incompatible with newer Rust compilers. Removing it allows cargo to fetch updated dependencies.

**Verification:**
```bash
anchor --version
# Should show: anchor-cli 0.30.1
```

## Remaining Issue: blake3 Dependency Compilation ❌

Even with correct Anchor version, build fails with:
```
error[E0463]: can't find crate for `arrayref`
error[E0463]: can't find crate for `arrayvec`
error[E0463]: can't find crate for `digest`
```

This appears to be a Solana toolchain issue with blake3 v1.8.2 where optional dependencies aren't being compiled.

## Problem Summary

The `npm run solana:setup` script fails to build the Solana program due to multiple issues.

### Root Causes

1. **avm Bug**: Anchor Version Manager lists 0.30.1 as installed but the binary doesn't exist in `~/.avm/bin/`
   - Only anchor-0.32.1 binary is actually present
   - avm fails to install 0.30.1: "binary `anchor` already exists in destination"

2. **Version 0.32.1 Incompatible**: Upgrading to 0.32.1 causes dependency conflicts:
   ```
   error: failed to select a version for `solana-instruction`
   conflict between solana-instruction 2.2.1 and 2.3.3
   ```

3. **Manual Install Fails**: Installing 0.30.1 via cargo also fails:
   ```
   error: could not compile `time` (lib) due to 1 previous error
   ```
   This is due to newer Rust compiler incompatibility with anchor-cli 0.30.1 dependencies.

## ✅ SOLUTION: Use cargo build-sbf (RECOMMENDED)

The Anchor build issue has been resolved by bypassing Anchor's IDL generation entirely and using Solana's BPF builder directly:

```bash
cd solana

# Build the program binary
cargo build-sbf --manifest-path=programs/game/Cargo.toml

# Copy to deployment location
mkdir -p target/deploy
cp programs/game/target/deploy/game.so target/deploy/

# Deploy
solana program deploy target/deploy/game.so --url http://localhost:8899
```

**Why this works:**
- Bypasses Anchor's IDL generation bug (proc-macro2 `source_file()` issue)
- Uses Solana's native 1.84.1-dev toolchain (no Rust version conflicts)
- Still produces a working program binary
- Can be deployed and tested normally

**What you lose:**
- No IDL file generated (but not needed for local testing)
- Can't use `anchor deploy` command

**This solution is now integrated into:**
- `scripts/setup-local-test.sh` (npm run solana:setup)
- Documentation in README.md

## Previous Workarounds (Historical)

### Option 1: Use Pre-built Program

If you already have a deployed program on localnet from previous work, you can skip the build step:

1. Check if program is already deployed:
   ```bash
   solana program show Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS --url http://localhost:8899
   ```

2. If it exists, skip directly to testing:
   - Create test token
   - Mint tokens to your wallet
   - Test hide-treasure.html

### Option 2: Use anchor test (builds automatically)

Instead of running `anchor build` directly, use anchor test which handles versioning better:

```bash
cd solana
anchor test --skip-deploy  # This will build with correct version
```

Then manually deploy:
```bash
solana program deploy target/deploy/game.so --url http://localhost:8899
```

### Option 3: Downgrade Rust Compiler (Not Recommended)

The anchor-cli 0.30.1 dependencies require an older Rust version. You could:
```bash
rustup install 1.75.0
rustup override set 1.75.0
```

But this may break other tools.

## What's Affected

- `npm run solana:setup` - FAILS at build step
- `anchor build` - FAILS with version mismatch
- `anchor deploy` - Can't run without successful build

## What Still Works

- Local validator: `npm run solana:validator` ✅
- Vite dev server: `npm run vite` ✅
- Frontend code: All React/TypeScript ✅
- Test suite (if program already deployed): `npm run test:solana:local` ✅

## Next Steps for Testing Wallet

You don't actually need to rebuild the program to test the wallet integration! Here's what you CAN do right now:

1. **Check if program exists** (from previous deployment):
   ```bash
   solana program show Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS --url http://localhost:8899
   ```

2. **If it exists**, follow the wallet testing guide:
   - See `docs/WALLET_TESTING_QUICKSTART.md`
   - Create test token
   - Mint to your Phantom wallet
   - Test at http://localhost:5173/hide-treasure.html

3. **If program doesn't exist**, try Option 2 above (`anchor test`)

## Long-term Solution

The Anchor team needs to fix avm, or we need to:
- Migrate to Anchor 0.33+ when it's stable
- Use a different version manager
- Lock Rust toolchain version in project

## Questions?

If none of these workarounds help, let me know:
1. Have you successfully built/deployed this program before?
2. Do you have the program deployed on localnet currently?
3. Are you okay testing with anchor test instead of anchor build?
