import { SafeTransactionDataPartial } from "@gnosis.pm/safe-core-sdk-types";
import { Axios, AxiosAdapter } from "axios";
export interface SafeInfo {
    address: string;
    fallbackHandler: string;
    guard: string;
    masterCopy: string;
    modules: string[];
    nonce: number;
    owners: string[];
    threshold: number;
    version: string;
}
interface ConfirmationItem {
    owner: string;
    submissionDate: string;
    transactionHash: string | null;
    signature: string;
    signatureType: string;
}
export interface SafeTransactionItem {
    safe: string;
    to: string;
    value: string;
    data: string | null;
    operation: number;
    gasToken: string;
    safeTxGas: number;
    baseGas: number;
    gasPrice: string;
    refundReceiver: string;
    nonce: number;
    executionDate: string | null;
    submissionDate: string;
    modified: string;
    blockNumber: number | null;
    transactionHash: string | null;
    safeTxHash: string;
    executor: string | null;
    isExecuted: boolean;
    confirmations: ConfirmationItem[];
    signatures: string | null;
}
export default class RequestProvider {
    host: string;
    request: Axios;
    constructor(networkId: string, adapter?: AxiosAdapter);
    getPendingTransactions(safeAddress: string, nonce: number): Promise<{
        results: SafeTransactionItem[];
    }>;
    postTransactions(safeAddres: string, data: any): Promise<void>;
    getSafeInfo(safeAddress: string): Promise<SafeInfo>;
    confirmTransaction(hash: string, data: any): Promise<void>;
    getSafeTxGas(safeAddress: string, safeVersion: string, safeTxData: SafeTransactionDataPartial): Promise<number | undefined>;
}
export {};
