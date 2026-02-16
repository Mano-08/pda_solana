import { LiteSVM } from "litesvm";
import {
  PublicKey,
  Transaction,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import fs from "fs";
import { BorshAccountsCoder } from "@coral-xyz/anchor";

const idl = JSON.parse(fs.readFileSync("target/idl/pda_db.json", "utf-8"));
const accountsCoder = new BorshAccountsCoder(idl);

import { assert, expect } from "chai";

const PROGRAM_ID = new PublicKey(
  "5PHVkoS94fLyX12QvKdYTwsyVAdPSPXv668UK13d41Bk",
);

describe("pda_db - LiteSVM", () => {
  let svm: LiteSVM;
  let payer: Keypair;
  let programData: Buffer;
  const coder = new anchor.BorshInstructionCoder(idl as any);

  before(() => {
    svm = new LiteSVM();
    payer = new Keypair();

    svm.airdrop(payer.publicKey, BigInt(LAMPORTS_PER_SOL));

    // Load compiled program (.so)
    programData = fs.readFileSync("target/deploy/pda_db.so");

    svm.addProgram(PROGRAM_ID, programData);
  });

  function derivePDA(signer: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("count_data"), signer.toBuffer()],
      PROGRAM_ID,
    );
  }

  function buildInitializeIx(signer: PublicKey, pda: PublicKey, count: number) {
    const data = coder.encode("initialize", {
      count,
    });

    return new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: signer, isSigner: true, isWritable: true },
        { pubkey: pda, isSigner: false, isWritable: true },
        {
          pubkey: SystemProgram.programId,
          isSigner: false,
          isWritable: false,
        },
      ],
      data,
    });
  }

  function buildIncrementIx(signer: PublicKey, pda: PublicKey) {
    const data = coder.encode("increment", {});

    return new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: signer, isSigner: true, isWritable: true },
        { pubkey: pda, isSigner: false, isWritable: true },
      ],
      data,
    });
  }

  it("initialize PDA", () => {
    const [pda, bump] = derivePDA(payer.publicKey);

    const ix = buildInitializeIx(payer.publicKey, pda, 5);

    const tx = new Transaction();
    tx.recentBlockhash = svm.latestBlockhash();
    tx.add(ix);
    tx.sign(payer);

    svm.sendTransaction(tx);

    const accountInfo = svm.getAccount(pda);
    const decoded = accountsCoder.decode(
      "Counter",
      Buffer.from(accountInfo.data),
    );
    assert.equal(decoded.count, 5);
  });

  it("increment PDA", () => {
    const [pda] = derivePDA(payer.publicKey);

    const ix = buildIncrementIx(payer.publicKey, pda);

    const tx = new Transaction();
    tx.recentBlockhash = svm.latestBlockhash();
    tx.add(ix);
    tx.sign(payer);

    svm.sendTransaction(tx);

    const account = svm.getAccount(pda);
    const decoded = accountsCoder.decode("Counter", Buffer.from(account.data));
    assert.equal(decoded.count, 6);
  });

  it("fails if wrong signer used", () => {
    const attacker = new Keypair();
    svm.airdrop(attacker.publicKey, BigInt(1_000_000_000));

    const [pda] = derivePDA(payer.publicKey);

    const ix = buildIncrementIx(attacker.publicKey, pda);

    const tx = new Transaction();
    tx.recentBlockhash = svm.latestBlockhash();
    tx.add(ix);
    tx.sign(attacker);

    let failed = false;

    try {
      svm.sendTransaction(tx);
    } catch (e) {
      failed = true;
    }

    assert.isTrue(failed);
  });

  it("fails if PDA not initialized", () => {
    const randomUser = new Keypair();
    svm.airdrop(randomUser.publicKey, BigInt(1_000_000_000));

    const [pda] = derivePDA(randomUser.publicKey);

    const ix = buildIncrementIx(randomUser.publicKey, pda);

    const tx = new Transaction();
    tx.recentBlockhash = svm.latestBlockhash();
    tx.add(ix);
    tx.sign(randomUser);

    let failed = false;

    try {
      svm.sendTransaction(tx);
    } catch (e) {
      failed = true;
    }

    assert.isTrue(failed);
  });
});
