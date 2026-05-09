/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/roosta.json`.
 */
export type Roosta = {
  "address": "3i5GgdaySbxcBB133fp2Nyk9ER66d1fEGyTFCxqdjWqv",
  "metadata": {
    "name": "roosta",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Roosta - Rotating Savings and Credit Association (ROSCA) protocol on Solana"
  },
  "instructions": [
    {
      "name": "createCircle",
      "discriminator": [
        186,
        99,
        49,
        131,
        31,
        51,
        13,
        198
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "circle",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  105,
                  114,
                  99,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "arg",
                "path": "circleId"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "circle"
              }
            ]
          }
        },
        {
          "name": "collateralVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  108,
                  108,
                  97,
                  116,
                  101,
                  114,
                  97,
                  108,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "circle"
              }
            ]
          }
        },
        {
          "name": "round",
          "writable": true
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "circleId",
          "type": "u64"
        },
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "memberCount",
          "type": "u8"
        },
        {
          "name": "totalRounds",
          "type": "u8"
        },
        {
          "name": "contributionAmount",
          "type": "u64"
        },
        {
          "name": "roundDuration",
          "type": "i64"
        },
        {
          "name": "trustGateEnabled",
          "type": "bool"
        },
        {
          "name": "riskDepositEnabled",
          "type": "bool"
        },
        {
          "name": "lockedReserveEnabled",
          "type": "bool"
        },
        {
          "name": "earlyPositionCollateralRatio",
          "type": "u8"
        },
        {
          "name": "lockedReserveRatio",
          "type": "u8"
        },
        {
          "name": "gracePeriodSeconds",
          "type": "i64"
        }
      ]
    },
    {
      "name": "deposit",
      "discriminator": [
        242,
        35,
        198,
        137,
        82,
        225,
        242,
        182
      ],
      "accounts": [
        {
          "name": "member",
          "writable": true,
          "signer": true
        },
        {
          "name": "circle",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  105,
                  114,
                  99,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "circle.authority",
                "account": "circle"
              },
              {
                "kind": "account",
                "path": "circle.circle_id",
                "account": "circle"
              }
            ]
          }
        },
        {
          "name": "round",
          "writable": true
        },
        {
          "name": "memberStatus",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  98,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "circle"
              },
              {
                "kind": "account",
                "path": "member"
              }
            ]
          }
        },
        {
          "name": "memberVault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "member"
              }
            ]
          }
        },
        {
          "name": "memberVaultTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "member"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "circle"
              }
            ]
          }
        },
        {
          "name": "creditProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  114,
                  101,
                  100,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "member"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "depositRiskCollateral",
      "discriminator": [
        112,
        205,
        177,
        94,
        55,
        15,
        222,
        102
      ],
      "accounts": [
        {
          "name": "member",
          "writable": true,
          "signer": true
        },
        {
          "name": "circle",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  105,
                  114,
                  99,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "circle.authority",
                "account": "circle"
              },
              {
                "kind": "account",
                "path": "circle.circle_id",
                "account": "circle"
              }
            ]
          }
        },
        {
          "name": "memberStatus",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  98,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "circle"
              },
              {
                "kind": "account",
                "path": "member"
              }
            ]
          }
        },
        {
          "name": "memberVault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "member"
              }
            ]
          }
        },
        {
          "name": "memberVaultTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "member"
              }
            ]
          }
        },
        {
          "name": "collateralVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  108,
                  108,
                  97,
                  116,
                  101,
                  114,
                  97,
                  108,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "circle"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "initCreditProfile",
      "discriminator": [
        16,
        53,
        68,
        69,
        147,
        211,
        220,
        149
      ],
      "accounts": [
        {
          "name": "wallet",
          "writable": true,
          "signer": true
        },
        {
          "name": "creditProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  114,
                  101,
                  100,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "wallet"
              }
            ]
          }
        },
        {
          "name": "sbtMint",
          "docs": [
            "handler when minting the SBT for the first time."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  114,
                  101,
                  100,
                  105,
                  116,
                  95,
                  115,
                  98,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "wallet"
              }
            ]
          }
        },
        {
          "name": "sbtTokenAccount",
          "writable": true
        },
        {
          "name": "sbtAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  98,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "token2022Program",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initUserVault",
      "discriminator": [
        144,
        193,
        26,
        93,
        68,
        219,
        32,
        180
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "userVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "userVaultTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "joinCircle",
      "discriminator": [
        231,
        168,
        235,
        18,
        99,
        12,
        22,
        7
      ],
      "accounts": [
        {
          "name": "member",
          "writable": true,
          "signer": true
        },
        {
          "name": "circle",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  105,
                  114,
                  99,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "circle.authority",
                "account": "circle"
              },
              {
                "kind": "account",
                "path": "circle.circle_id",
                "account": "circle"
              }
            ]
          }
        },
        {
          "name": "round",
          "writable": true
        },
        {
          "name": "memberStatus",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  98,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "circle"
              },
              {
                "kind": "account",
                "path": "member"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "markDefault",
      "discriminator": [
        182,
        231,
        123,
        132,
        66,
        208,
        137,
        139
      ],
      "accounts": [
        {
          "name": "caller",
          "signer": true
        },
        {
          "name": "circle",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  105,
                  114,
                  99,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "circle.authority",
                "account": "circle"
              },
              {
                "kind": "account",
                "path": "circle.circle_id",
                "account": "circle"
              }
            ]
          }
        },
        {
          "name": "round"
        },
        {
          "name": "memberStatus",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  98,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "circle"
              },
              {
                "kind": "account",
                "path": "member_status.wallet",
                "account": "memberStatus"
              }
            ]
          }
        },
        {
          "name": "creditProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  114,
                  101,
                  100,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "member_status.wallet",
                "account": "memberStatus"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "markDelayed",
      "discriminator": [
        150,
        94,
        27,
        189,
        186,
        170,
        231,
        137
      ],
      "accounts": [
        {
          "name": "caller",
          "signer": true
        },
        {
          "name": "circle",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  105,
                  114,
                  99,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "circle.authority",
                "account": "circle"
              },
              {
                "kind": "account",
                "path": "circle.circle_id",
                "account": "circle"
              }
            ]
          }
        },
        {
          "name": "round",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "markMemberDelayed",
      "discriminator": [
        116,
        188,
        87,
        42,
        173,
        25,
        142,
        211
      ],
      "accounts": [
        {
          "name": "caller",
          "signer": true
        },
        {
          "name": "circle",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  105,
                  114,
                  99,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "circle.authority",
                "account": "circle"
              },
              {
                "kind": "account",
                "path": "circle.circle_id",
                "account": "circle"
              }
            ]
          }
        },
        {
          "name": "round"
        },
        {
          "name": "memberStatus",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  98,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "circle"
              },
              {
                "kind": "account",
                "path": "member_status.wallet",
                "account": "memberStatus"
              }
            ]
          }
        },
        {
          "name": "creditProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  114,
                  101,
                  100,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "member_status.wallet",
                "account": "memberStatus"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "mintPositionNft",
      "discriminator": [
        230,
        76,
        149,
        174,
        91,
        136,
        159,
        143
      ],
      "accounts": [
        {
          "name": "member",
          "writable": true,
          "signer": true
        },
        {
          "name": "circle",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  105,
                  114,
                  99,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "circle.authority",
                "account": "circle"
              },
              {
                "kind": "account",
                "path": "circle.circle_id",
                "account": "circle"
              }
            ]
          }
        },
        {
          "name": "memberStatus",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  98,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "circle"
              },
              {
                "kind": "account",
                "path": "member"
              }
            ]
          }
        },
        {
          "name": "positionAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "circle"
              }
            ]
          }
        },
        {
          "name": "positionMint",
          "writable": true,
          "signer": true
        },
        {
          "name": "positionTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "member"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "positionMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "metadata",
          "writable": true
        },
        {
          "name": "masterEdition",
          "writable": true
        },
        {
          "name": "tokenMetadataProgram",
          "address": "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "slashCollateral",
      "discriminator": [
        48,
        90,
        11,
        43,
        179,
        65,
        184,
        4
      ],
      "accounts": [
        {
          "name": "caller",
          "signer": true
        },
        {
          "name": "circle",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  105,
                  114,
                  99,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "circle.authority",
                "account": "circle"
              },
              {
                "kind": "account",
                "path": "circle.circle_id",
                "account": "circle"
              }
            ]
          }
        },
        {
          "name": "round",
          "writable": true
        },
        {
          "name": "memberStatus",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  98,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "circle"
              },
              {
                "kind": "account",
                "path": "member_status.wallet",
                "account": "memberStatus"
              }
            ]
          }
        },
        {
          "name": "collateralVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  108,
                  108,
                  97,
                  116,
                  101,
                  114,
                  97,
                  108,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "circle"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "circle"
              }
            ]
          }
        },
        {
          "name": "creditProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  114,
                  101,
                  100,
                  105,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "member_status.wallet",
                "account": "memberStatus"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "topUpVault",
      "discriminator": [
        211,
        201,
        198,
        72,
        45,
        101,
        12,
        10
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true,
          "relations": [
            "userVault"
          ]
        },
        {
          "name": "userVault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "userVaultTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "triggerPayout",
      "discriminator": [
        145,
        81,
        98,
        96,
        194,
        251,
        69,
        38
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "circle",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  105,
                  114,
                  99,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "circle.authority",
                "account": "circle"
              },
              {
                "kind": "account",
                "path": "circle.circle_id",
                "account": "circle"
              }
            ]
          }
        },
        {
          "name": "round",
          "writable": true
        },
        {
          "name": "recipientStatus",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  98,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "circle"
              },
              {
                "kind": "account",
                "path": "round.recipient",
                "account": "round"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "circle"
              }
            ]
          }
        },
        {
          "name": "collateralVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  108,
                  108,
                  97,
                  116,
                  101,
                  114,
                  97,
                  108,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "circle"
              }
            ]
          }
        },
        {
          "name": "recipientVault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "round.recipient",
                "account": "round"
              }
            ]
          }
        },
        {
          "name": "recipientVaultTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "round.recipient",
                "account": "round"
              }
            ]
          }
        },
        {
          "name": "nextRound",
          "docs": [
            "Optional next round account. Required unless current round is the last."
          ],
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "tryActivateRound1",
      "discriminator": [
        229,
        143,
        41,
        159,
        34,
        154,
        87,
        24
      ],
      "accounts": [
        {
          "name": "caller",
          "signer": true
        },
        {
          "name": "circle",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  105,
                  114,
                  99,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "circle.authority",
                "account": "circle"
              },
              {
                "kind": "account",
                "path": "circle.circle_id",
                "account": "circle"
              }
            ]
          }
        },
        {
          "name": "round",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "unlockReserve",
      "discriminator": [
        31,
        16,
        103,
        3,
        75,
        75,
        43,
        116
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "circle",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  105,
                  114,
                  99,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "circle.authority",
                "account": "circle"
              },
              {
                "kind": "account",
                "path": "circle.circle_id",
                "account": "circle"
              }
            ]
          }
        },
        {
          "name": "memberStatus",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  98,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "circle"
              },
              {
                "kind": "account",
                "path": "member_status.wallet",
                "account": "memberStatus"
              }
            ]
          }
        },
        {
          "name": "collateralVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  108,
                  108,
                  97,
                  116,
                  101,
                  114,
                  97,
                  108,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "circle"
              }
            ]
          }
        },
        {
          "name": "recipientVaultTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "member_status.wallet",
                "account": "memberStatus"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "withdrawVault",
      "discriminator": [
        135,
        7,
        237,
        120,
        149,
        94,
        95,
        7
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true,
          "relations": [
            "userVault"
          ]
        },
        {
          "name": "userVault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "userVaultTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "circle",
      "discriminator": [
        27,
        59,
        8,
        117,
        62,
        199,
        222,
        252
      ]
    },
    {
      "name": "creditProfile",
      "discriminator": [
        155,
        31,
        253,
        22,
        211,
        62,
        131,
        148
      ]
    },
    {
      "name": "memberStatus",
      "discriminator": [
        188,
        179,
        202,
        44,
        125,
        224,
        127,
        139
      ]
    },
    {
      "name": "round",
      "discriminator": [
        87,
        127,
        165,
        51,
        73,
        78,
        116,
        174
      ]
    },
    {
      "name": "userVault",
      "discriminator": [
        23,
        76,
        96,
        159,
        210,
        10,
        5,
        22
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "notMember",
      "msg": "Caller is not a member of this circle"
    },
    {
      "code": 6001,
      "name": "alreadyDeposited",
      "msg": "Member has already deposited for this round"
    },
    {
      "code": 6002,
      "name": "circleFull",
      "msg": "Circle is already full"
    },
    {
      "code": 6003,
      "name": "alreadyJoined",
      "msg": "Member has already joined this circle"
    },
    {
      "code": 6004,
      "name": "roundNotActive",
      "msg": "Round is not currently active"
    },
    {
      "code": 6005,
      "name": "circleNotActive",
      "msg": "Circle is not active"
    },
    {
      "code": 6006,
      "name": "notAllDepositsReceived",
      "msg": "Not all deposits received for this round"
    },
    {
      "code": 6007,
      "name": "alreadySettled",
      "msg": "Round has already been settled"
    },
    {
      "code": 6008,
      "name": "invalidRoundNumber",
      "msg": "Invalid round number"
    },
    {
      "code": 6009,
      "name": "nameTooLong",
      "msg": "Name exceeds maximum length"
    },
    {
      "code": 6010,
      "name": "vaultNotInitialized",
      "msg": "User vault is not initialized"
    },
    {
      "code": 6011,
      "name": "insufficientVaultBalance",
      "msg": "Insufficient vault balance"
    },
    {
      "code": 6012,
      "name": "riskDepositNotEnabled",
      "msg": "Risk deposit not enabled for this circle"
    },
    {
      "code": 6013,
      "name": "positionNotEligibleForCollateral",
      "msg": "Position does not require risk collateral"
    },
    {
      "code": 6014,
      "name": "collateralAlreadyDeposited",
      "msg": "Collateral already deposited"
    },
    {
      "code": 6015,
      "name": "circleAlreadyStarted",
      "msg": "Circle has already started rounds"
    },
    {
      "code": 6016,
      "name": "noLockedReserve",
      "msg": "No locked reserve to unlock"
    },
    {
      "code": 6017,
      "name": "reserveAlreadyUnlocked",
      "msg": "Reserve already fully unlocked"
    },
    {
      "code": 6018,
      "name": "round1NotReady",
      "msg": "Circle round 1 is not yet eligible to activate"
    },
    {
      "code": 6019,
      "name": "round1AlreadyActivated",
      "msg": "Round 1 already activated"
    },
    {
      "code": 6020,
      "name": "deadlineNotPassed",
      "msg": "Round deadline has not yet passed"
    },
    {
      "code": 6021,
      "name": "roundNotDelayed",
      "msg": "Round is not in delayed state"
    },
    {
      "code": 6022,
      "name": "memberAlreadyPaid",
      "msg": "Member already deposited this round"
    },
    {
      "code": 6023,
      "name": "alreadyDelayed",
      "msg": "Member already marked delayed for this round"
    },
    {
      "code": 6024,
      "name": "gracePeriodNotElapsed",
      "msg": "Grace period has not yet elapsed"
    },
    {
      "code": 6025,
      "name": "memberNotDelayed",
      "msg": "Member is not in delayed state"
    },
    {
      "code": 6026,
      "name": "alreadyDefaulted",
      "msg": "Member already marked defaulted for this round"
    },
    {
      "code": 6027,
      "name": "memberNotDefaulted",
      "msg": "Member is not defaulted"
    },
    {
      "code": 6028,
      "name": "alreadySlashed",
      "msg": "Member already slashed"
    },
    {
      "code": 6029,
      "name": "creditProfileNotInitialized",
      "msg": "Credit profile not initialized"
    },
    {
      "code": 6030,
      "name": "positionNftAlreadyMinted",
      "msg": "Position NFT already minted for this member"
    }
  ],
  "types": [
    {
      "name": "circle",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "circleId",
            "type": "u64"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "usdcMint",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "memberCount",
            "type": "u8"
          },
          {
            "name": "totalRounds",
            "type": "u8"
          },
          {
            "name": "currentRound",
            "type": "u8"
          },
          {
            "name": "contributionAmount",
            "type": "u64"
          },
          {
            "name": "roundDuration",
            "type": "i64"
          },
          {
            "name": "startedAt",
            "type": "i64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "circleStatus"
              }
            }
          },
          {
            "name": "members",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "payoutOrder",
            "type": "bytes"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "vaultBump",
            "type": "u8"
          },
          {
            "name": "collateralVault",
            "type": "pubkey"
          },
          {
            "name": "trustGateEnabled",
            "type": "bool"
          },
          {
            "name": "riskDepositEnabled",
            "type": "bool"
          },
          {
            "name": "lockedReserveEnabled",
            "type": "bool"
          },
          {
            "name": "earlyPositionCollateralRatio",
            "type": "u8"
          },
          {
            "name": "lockedReserveRatio",
            "type": "u8"
          },
          {
            "name": "gracePeriodSeconds",
            "type": "i64"
          },
          {
            "name": "riskCollateralsCollected",
            "type": "u8"
          },
          {
            "name": "round1Activated",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "circleStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "active"
          },
          {
            "name": "completed"
          },
          {
            "name": "cancelled"
          }
        ]
      }
    },
    {
      "name": "creditProfile",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "trustTier",
            "type": {
              "defined": {
                "name": "trustTier"
              }
            }
          },
          {
            "name": "circlesCompleted",
            "type": "u32"
          },
          {
            "name": "onTimePayments",
            "type": "u32"
          },
          {
            "name": "latePayments",
            "type": "u32"
          },
          {
            "name": "defaults",
            "type": "u32"
          },
          {
            "name": "totalVolume",
            "type": "u64"
          },
          {
            "name": "lastUpdatedAt",
            "type": "i64"
          },
          {
            "name": "earlyPositionEligible",
            "type": "bool"
          },
          {
            "name": "sbtMint",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "memberStatus",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "circle",
            "type": "pubkey"
          },
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "joinedAt",
            "type": "i64"
          },
          {
            "name": "totalDeposited",
            "type": "u64"
          },
          {
            "name": "depositCount",
            "type": "u8"
          },
          {
            "name": "missedCount",
            "type": "u8"
          },
          {
            "name": "receivedAmount",
            "type": "u64"
          },
          {
            "name": "receivedAt",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "payoutOrder",
            "type": "u8"
          },
          {
            "name": "positionNftMint",
            "type": "pubkey"
          },
          {
            "name": "collateralNftMintSome",
            "type": "bool"
          },
          {
            "name": "collateralNftMint",
            "type": "pubkey"
          },
          {
            "name": "defaultCount",
            "type": "u8"
          },
          {
            "name": "collateralAmount",
            "type": "u64"
          },
          {
            "name": "lockedReserveAmount",
            "type": "u64"
          },
          {
            "name": "statusEnum",
            "type": {
              "defined": {
                "name": "memberStatusEnum"
              }
            }
          },
          {
            "name": "lockedReserveInitial",
            "type": "u64"
          },
          {
            "name": "lockedReserveUnlocksDone",
            "type": "u8"
          },
          {
            "name": "lastDelayedRound",
            "type": "u8"
          },
          {
            "name": "lastDefaultedRound",
            "type": "u8"
          },
          {
            "name": "slashed",
            "type": "bool"
          },
          {
            "name": "shortfall",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "memberStatusEnum",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "active"
          },
          {
            "name": "paid"
          },
          {
            "name": "received"
          },
          {
            "name": "completed"
          },
          {
            "name": "delayed"
          },
          {
            "name": "defaulted"
          },
          {
            "name": "slashed"
          }
        ]
      }
    },
    {
      "name": "round",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "circle",
            "type": "pubkey"
          },
          {
            "name": "roundNumber",
            "type": "u8"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "depositsCount",
            "type": "u8"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "roundStatus"
              }
            }
          },
          {
            "name": "startedAt",
            "type": "i64"
          },
          {
            "name": "settledAt",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "deposits",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "deadline",
            "type": "i64"
          },
          {
            "name": "totalCollected",
            "type": "u64"
          },
          {
            "name": "payoutAmount",
            "type": "u64"
          },
          {
            "name": "reserveAmount",
            "type": "u64"
          },
          {
            "name": "delayedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "roundStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending"
          },
          {
            "name": "active"
          },
          {
            "name": "settled"
          },
          {
            "name": "delayed"
          }
        ]
      }
    },
    {
      "name": "trustTier",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "tier0New"
          },
          {
            "name": "tier1Verified"
          },
          {
            "name": "tier2Trusted"
          },
          {
            "name": "tier3Prime"
          },
          {
            "name": "tier4Guarantor"
          }
        ]
      }
    },
    {
      "name": "userVault",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "circleSeed",
      "type": "bytes",
      "value": "[99, 105, 114, 99, 108, 101]"
    },
    {
      "name": "collateralVaultSeed",
      "type": "bytes",
      "value": "[99, 111, 108, 108, 97, 116, 101, 114, 97, 108, 95, 118, 97, 117, 108, 116]"
    },
    {
      "name": "creditSeed",
      "type": "bytes",
      "value": "[99, 114, 101, 100, 105, 116]"
    },
    {
      "name": "memberSeed",
      "type": "bytes",
      "value": "[109, 101, 109, 98, 101, 114]"
    },
    {
      "name": "roundSeed",
      "type": "bytes",
      "value": "[114, 111, 117, 110, 100]"
    },
    {
      "name": "userVaultAtaSeed",
      "type": "bytes",
      "value": "[117, 115, 101, 114, 95, 118, 97, 117, 108, 116, 95, 97, 116, 97]"
    },
    {
      "name": "userVaultSeed",
      "type": "bytes",
      "value": "[117, 115, 101, 114, 95, 118, 97, 117, 108, 116]"
    },
    {
      "name": "vaultSeed",
      "type": "bytes",
      "value": "[118, 97, 117, 108, 116]"
    }
  ]
};
