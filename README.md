# Anchor Program - PDA to Store User Data

This project demonstrates how to use a Program Derived Address (PDA) in an Anchor program to store user-specific data on Solana.

## Overview

The program creates a PDA for each user using a deterministic seed.  
Each PDA stores:

- A counter value
- The authority (user) who controls the account

The program supports:

- Initializing a PDA account
- Incrementing the stored counter

## Build

To build the program:

```ts
anchor build
```

To Test the program:

```ts
anchor test
```
