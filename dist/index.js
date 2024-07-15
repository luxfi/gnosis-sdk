import { Contract } from "ethers";
import { BigNumber } from "@ethersproject/bignumber";
import BN from "bignumber.js";
import { getSafeSingletonDeployment } from "@safe-global/safe-deployments";
import { toChecksumAddress } from "web3-utils";
import SafeTransaction from "@gnosis.pm/safe-core-sdk/dist/src/utils/transactions/SafeTransaction";
import RequestProvider from "./api";
import { standardizeSafeTransactionData, sameString, generateSignature, generatePreValidatedSignature, estimateGasForTransactionExecution, } from "./utils";
class Safe {
    constructor(safeAddress, version, provider, network = "1") {
        this.owners = [];
        this.safeInfo = null;
        this.getBasicSafeInfo = async () => {
            const [threshold, nonce, owners] = await Promise.all([
                this.getThreshold(),
                this.getNonce(),
                this.getOwners(),
            ]);
            return {
                address: this.safeAddress,
                version: this.version,
                threshold,
                nonce,
                owners,
            };
        };
        const contract = getSafeSingletonDeployment({
            version,
            network,
        });
        if (!contract) {
            throw new Error("Wrong version or network");
        }
        this.provider = provider;
        this.contract = new Contract(safeAddress, contract.abi, this.provider);
        this.version = version;
        this.safeAddress = safeAddress;
        this.network = network;
        this.request = new RequestProvider(network, Safe.adapter);
        // this.init();
    }
    /**
     * @deprecated
     * @param safeAddress
     * @param network
     * @returns
     */
    static getSafeInfo(safeAddress, network) {
        const request = new RequestProvider(network, Safe.adapter);
        return request.getSafeInfo(toChecksumAddress(safeAddress));
    }
    static async getPendingTransactions(safeAddress, network, nonce) {
        const request = new RequestProvider(network, Safe.adapter);
        const transactions = await request.getPendingTransactions(safeAddress, nonce);
        return transactions;
    }
    async getPendingTransactions() {
        const nonce = await this.getNonce();
        const transactions = await this.request.getPendingTransactions(this.safeAddress, nonce);
        return transactions;
    }
    static async getSafeVersion({ address, provider, }) {
        const contract = new Contract(address, [
            {
                constant: true,
                inputs: [],
                name: "VERSION",
                outputs: [
                    {
                        internalType: "string",
                        name: "",
                        type: "string",
                    },
                ],
                payable: false,
                stateMutability: "view",
                type: "function",
            },
        ], provider);
        const version = await contract.VERSION();
        return version;
    }
    async init() {
        const safeInfo = await Safe.getSafeInfo(this.safeAddress, this.network);
        this.safeInfo = safeInfo;
        if (this.version !== safeInfo.version) {
            throw new Error(`Current version ${this.version} not matched address version ${safeInfo.version}`);
        }
        this.version = safeInfo.version;
        this.owners = safeInfo.owners;
    }
    async getOwners() {
        const owners = await this.contract.getOwners();
        return owners;
    }
    async getThreshold() {
        const threshold = await this.contract.getThreshold();
        return threshold.toNumber();
    }
    async getNonce() {
        const nonce = await this.contract.nonce();
        return nonce.toNumber();
    }
    async buildTransaction(data) {
        const transaction = await standardizeSafeTransactionData(this.safeAddress, this.contract, this.provider, data, this.network, this.version);
        return new SafeTransaction(transaction);
    }
    async getTransactionHash(transaction) {
        const transactionData = transaction.data;
        return this.contract.getTransactionHash(transactionData.to, transactionData.value, transactionData.data, transactionData.operation, transactionData.safeTxGas, transactionData.baseGas, transactionData.gasPrice, transactionData.gasToken, transactionData.refundReceiver, transactionData.nonce);
    }
    async signTransactionHash(hash) {
        const owners = await this.getOwners();
        const signer = await this.provider.getSigner(0);
        const signerAddress = await signer.getAddress();
        const addressIsOwner = owners.find((owner) => signerAddress && sameString(owner, signerAddress));
        if (!addressIsOwner) {
            throw new Error("Transactions can only be signed by Safe owners");
        }
        return generateSignature(this.provider, hash);
    }
    async signTransaction(transaction) {
        const hash = await this.getTransactionHash(transaction);
        const sig = await this.signTransactionHash(hash);
        transaction.addSignature(sig);
    }
    async getOwnersWhoApprovedTx(txHash) {
        const owners = await this.getOwners();
        let ownersWhoApproved = [];
        for (const owner of owners) {
            const approved = await this.contract.approvedHashes(owner, txHash);
            if (approved.gt(0)) {
                ownersWhoApproved.push(owner);
            }
        }
        return ownersWhoApproved;
    }
    async postTransaction(transaction, hash) {
        const signer = this.provider.getSigner(0);
        const signerAddress = await signer.getAddress();
        const safeAddress = toChecksumAddress(this.safeAddress);
        await this.request.postTransactions(this.safeAddress, {
            safe: safeAddress,
            to: toChecksumAddress(transaction.data.to),
            value: new BN(transaction.data.value).toFixed(),
            data: transaction.data.data,
            operation: transaction.data.operation,
            gasToken: transaction.data.gasToken,
            safeTxGas: transaction.data.safeTxGas,
            baseGas: transaction.data.baseGas,
            gasPrice: transaction.data.gasPrice,
            refundReceiver: transaction.data.refundReceiver,
            nonce: transaction.data.nonce,
            contractTransactionHash: hash,
            sender: toChecksumAddress(signerAddress),
            signature: transaction.encodedSignatures(),
        });
    }
    async confirmTransaction(safeTransaction) {
        const hash = await this.getTransactionHash(safeTransaction);
        const signature = await this.signTransactionHash(hash);
        safeTransaction.addSignature(signature);
        const signer = await this.provider.getSigner(0);
        const signerAddress = await signer.getAddress();
        const sig = safeTransaction.signatures.get(signerAddress === null || signerAddress === void 0 ? void 0 : signerAddress.toLowerCase());
        if (sig) {
            await this.request.confirmTransaction(hash, { signature: sig.data });
        }
    }
    async getBalance() {
        return this.provider.getBalance(this.safeAddress);
    }
    async executeTransaction(safeTransaction, options) {
        const txHash = await this.getTransactionHash(safeTransaction);
        const ownersWhoApprovedTx = await this.getOwnersWhoApprovedTx(txHash);
        for (const owner of ownersWhoApprovedTx) {
            safeTransaction.addSignature(generatePreValidatedSignature(owner));
        }
        const owners = await this.getOwners();
        const signer = await this.provider.getSigner(0);
        const contract = this.contract.connect(signer);
        const signerAddress = await signer.getAddress();
        if (owners.includes(signerAddress)) {
            safeTransaction.addSignature(generatePreValidatedSignature(signerAddress));
        }
        const threshold = await this.getThreshold();
        if (threshold > safeTransaction.signatures.size) {
            const signaturesMissing = threshold - safeTransaction.signatures.size;
            throw new Error(`There ${signaturesMissing > 1 ? "are" : "is"} ${signaturesMissing} signature${signaturesMissing > 1 ? "s" : ""} missing`);
        }
        const value = BigNumber.from(safeTransaction.data.value);
        if (!value.isZero()) {
            const balance = await this.getBalance();
            if (value.gt(BigNumber.from(balance))) {
                throw new Error("Not enough Ether funds");
            }
        }
        const gasLimit = await estimateGasForTransactionExecution(contract, signerAddress, safeTransaction);
        const executionOptions = {
            gasLimit,
            gasPrice: options === null || options === void 0 ? void 0 : options.gasPrice,
            from: signerAddress,
        };
        const txResponse = await contract.execTransaction(safeTransaction.data.to, safeTransaction.data.value, safeTransaction.data.data, safeTransaction.data.operation, safeTransaction.data.safeTxGas, safeTransaction.data.baseGas, safeTransaction.data.gasPrice, safeTransaction.data.gasToken, safeTransaction.data.refundReceiver, safeTransaction.encodedSignatures(), executionOptions);
        return txResponse;
    }
}
export default Safe;
