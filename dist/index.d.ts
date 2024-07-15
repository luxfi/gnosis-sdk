import { Contract } from "ethers";
import { BigNumber } from "@ethersproject/bignumber";
import { providers } from "ethers";
import { SafeTransactionDataPartial, SafeSignature } from "@gnosis.pm/safe-core-sdk-types";
import { TransactionResult, TransactionOptions } from "@gnosis.pm/safe-core-sdk/dist/src/utils/transactions/types";
import SafeTransaction from "@gnosis.pm/safe-core-sdk/dist/src/utils/transactions/SafeTransaction";
import RequestProvider, { SafeInfo } from "./api";
import { AxiosAdapter } from "axios";
declare class Safe {
    contract: Contract;
    safeAddress: string;
    owners: string[];
    version: string;
    provider: providers.Web3Provider;
    safeInfo: SafeInfo | null;
    request: RequestProvider;
    network: string;
    static adapter: AxiosAdapter;
    constructor(safeAddress: string, version: string, provider: providers.Web3Provider, network?: string);
    /**
     * @deprecated
     * @param safeAddress
     * @param network
     * @returns
     */
    static getSafeInfo(safeAddress: string, network: string): Promise<SafeInfo>;
    static getPendingTransactions(safeAddress: string, network: string, nonce: number): Promise<{
        results: import("./api").SafeTransactionItem[];
    }>;
    getPendingTransactions(): Promise<{
        results: import("./api").SafeTransactionItem[];
    }>;
    static getSafeVersion({ address, provider, }: {
        address: any;
        provider: providers.Web3Provider;
    }): Promise<string>;
    init(): Promise<void>;
    getOwners(): Promise<string[]>;
    getThreshold(): Promise<number>;
    getNonce(): Promise<number>;
    getBasicSafeInfo: () => Promise<{
        address: string;
        version: string;
        threshold: number;
        nonce: number;
        owners: string[];
    }>;
    buildTransaction(data: SafeTransactionDataPartial): Promise<SafeTransaction>;
    getTransactionHash(transaction: SafeTransaction): Promise<any>;
    signTransactionHash(hash: string): Promise<SafeSignature>;
    signTransaction(transaction: SafeTransaction): Promise<void>;
    getOwnersWhoApprovedTx(txHash: string): Promise<string[]>;
    postTransaction(transaction: SafeTransaction, hash: string): Promise<void>;
    confirmTransaction(safeTransaction: SafeTransaction): Promise<void>;
    getBalance(): Promise<BigNumber>;
    executeTransaction(safeTransaction: SafeTransaction, options?: TransactionOptions): Promise<TransactionResult>;
}
export default Safe;
export type BasicSafeInfo = Awaited<ReturnType<Safe["getBasicSafeInfo"]>>;
