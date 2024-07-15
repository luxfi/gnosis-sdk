import { Contract, providers } from "ethers";
import { OperationType, SafeTransactionData, SafeTransactionDataPartial, SafeSignature, SafeTransaction } from "@gnosis.pm/safe-core-sdk-types";
import EthSignSignature from "@gnosis.pm/safe-core-sdk/dist/src/utils/signatures/SafeSignature";
export declare function sameString(str1: string, str2: string): boolean;
export declare function isRestrictedAddress(address: string): boolean;
export declare const isLegacyVersion: (safeVersion: string) => boolean;
export declare function estimateTxGas(safeAddress: string, safeContract: Contract, provider: providers.Web3Provider, to: string, valueInWei: string, data: string, operation: OperationType): Promise<number>;
export declare function standardizeSafeTransactionData(safeAddress: string, safeContract: Contract, provider: any, tx: SafeTransactionDataPartial, network: string, version: string): Promise<SafeTransactionData>;
export declare function generatePreValidatedSignature(ownerAddress: string): SafeSignature;
export declare function isTxHashSignedWithPrefix(txHash: string, signature: string, ownerAddress: string): boolean;
export declare function adjustVInSignature(signature: string, hasPrefix: boolean): string;
export declare function generateSignature(provider: providers.Web3Provider, hash: string): Promise<EthSignSignature>;
export declare function estimateGasForTransactionExecution(safeContract: Contract, from: string, tx: SafeTransaction): Promise<number>;