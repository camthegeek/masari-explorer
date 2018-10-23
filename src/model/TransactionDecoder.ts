import {Transaction as RawTransaction, TransactionJson} from "../repositories/Daemon";
import {CryptoUtils} from "./CryptoUtils";
import {CnUtilNative} from "./CnUtilNative";

export namespace Model {
	export const TX_EXTRA_PADDING_MAX_COUNT = 255;
	export const TX_EXTRA_NONCE_MAX_COUNT = 255;

	export const TX_EXTRA_TAG_PADDING = 0x00;
	export const TX_EXTRA_TAG_PUBKEY = 0x01;
	export const TX_EXTRA_NONCE = 0x02;
	export const TX_EXTRA_MERGE_MINING_TAG = 0x03;
	export const TX_EXTRA_TAG_ADDITIONAL_PUBKEYS = 0x04;
	export const TX_EXTRA_MYSTERIOUS_MINERGATE_TAG = 0xDE;


	export const TX_EXTRA_NONCE_PAYMENT_ID = 0x00;
	export const TX_EXTRA_NONCE_ENCRYPTED_PAYMENT_ID = 0x01;

	export type TxExtra = {
		type: number,
		data: number[]
	};

	export class TransactionDecoder {

		static parseExtra(oextra: number[]): TxExtra[] {
			let extra = oextra.slice();
			let extras: TxExtra[] = [];
			let hasFoundPubKey = false;

			// console.log('extra', oextra);
			while (extra.length > 0) {
				let extraSize = 0;
				let startOffset = 0;
				if (
					extra[0] === TX_EXTRA_NONCE ||
					extra[0] === TX_EXTRA_MERGE_MINING_TAG ||
					extra[0] === TX_EXTRA_MYSTERIOUS_MINERGATE_TAG
				) {
					extraSize = extra[1];
					startOffset = 2;
				} else if (extra[0] === TX_EXTRA_TAG_PUBKEY) {
					extraSize = 32;
					startOffset = 1;
					hasFoundPubKey = true;
				} else if (extra[0] === TX_EXTRA_TAG_PADDING) {
					let iExtra = 2;
					let fextras = {
						type: extra[0],
						data: [extra[1]]
					};

					while (extra.length > iExtra && extra[iExtra++] == 0) {
						fextras.data.push(0);
					}

					continue;
				} else if (extra[0] === TX_EXTRA_TAG_ADDITIONAL_PUBKEYS) {
					extraSize = extra[1] * 32;
					startOffset = 2;
				}

				if (extraSize === 0) {
					if (!hasFoundPubKey)
						throw 'Invalid extra size' + extra[0];
					break;
				}

				let data = extra.slice(startOffset, startOffset + extraSize);
				extras.push({
					type: extra[0],
					data: data
				});
				extra = extra.slice(startOffset + extraSize);
				// console.log(extra, extras);
			}

			return extras;
		}

		static parse(rawTransaction: TransactionJson, keys : {view:{pub:string,priv:string}, spend:{pub:string}}): any[] {
			let tx_pub_key = '';
			let paymentId: string | null = null;

			let tx_extras = [];
			try {
				tx_extras = this.parseExtra(rawTransaction.extra);
			} catch (e) {
				console.error(e);
				return [];
			}
			for (let extra of tx_extras) {
				if (extra.type === TX_EXTRA_TAG_PUBKEY) {
					for (let i = 0; i < 32; ++i) {
						tx_pub_key += String.fromCharCode(extra.data[i]);
					}
					break;
				}
			}

			if (tx_pub_key === '') {
				return [];
			}
			tx_pub_key = CryptoUtils.bintohex(tx_pub_key);
			let encryptedPaymentId: string | null = null;

			for (let extra of tx_extras) {
				if (extra.type === TX_EXTRA_NONCE) {
					if (extra.data[0] === TX_EXTRA_NONCE_PAYMENT_ID) {
						paymentId = '';
						for (let i = 1; i < extra.data.length; ++i) {
							paymentId += String.fromCharCode(extra.data[i]);
						}
						paymentId = CryptoUtils.bintohex(paymentId);
						break;
					} else if (extra.data[0] === TX_EXTRA_NONCE_ENCRYPTED_PAYMENT_ID) {
						encryptedPaymentId = '';
						for (let i = 1; i < extra.data.length; ++i) {
							encryptedPaymentId += String.fromCharCode(extra.data[i]);
						}
						encryptedPaymentId = CryptoUtils.bintohex(encryptedPaymentId);
						break;
					}
				}
			}

			let derivation = null;
			try {
				// derivation = cnUtil.generate_key_derivation(tx_pub_key, wallet.keys.priv.view);//9.7ms
				derivation = CnUtilNative.generate_key_derivation(tx_pub_key, keys.view.priv);
			} catch (e) {
				console.log('UNABLE TO CREATE DERIVATION', e);
				return [];
			}

			let outs: {
				amount:number,
				pubKey:string,
				output_idx_in_tx:number
			}[] = [];

			for (let iOut = 0; iOut < rawTransaction.vout.length; ++iOut) {
				let out = rawTransaction.vout[iOut];
				let txout_k = out.target;
				let amount = out.amount;
				let output_idx_in_tx = iOut;

				// let generated_tx_pubkey = cnUtil.derive_public_key(derivation,output_idx_in_tx,wallet.keys.pub.spend);//5.5ms
				let generated_tx_pubkey = CnUtilNative.derive_public_key(derivation,output_idx_in_tx,keys.spend.pub);//5.5ms

				// check if generated public key matches the current output's key
				let mine_output = (txout_k.key == generated_tx_pubkey);

				if (mine_output) {
					let minerTx = false;

					if (amount !== 0) {//miner tx
						minerTx = true;
					} else {
						let mask = rawTransaction.rct_signatures.ecdhInfo[output_idx_in_tx].mask;
						let r = CryptoUtils.decode_ringct(rawTransaction.rct_signatures,
							tx_pub_key,
							keys.view.priv,
							output_idx_in_tx,
							mask,
							amount,
							derivation);

						if (r === false)
							console.error("Cant decode ringCT!");
						else
							amount = r;
					}

					outs.push({
						amount:amount,
						pubKey:txout_k.key,
						output_idx_in_tx:output_idx_in_tx
					});

					if (minerTx)
						break;
				} //  if (mine_output)
			}

			return outs;
		}

		static proveSent(txPrivKey : string, recipientAddress : string, transaction : TransactionJson) {
			let decodedAddress = cnUtil.decode_address(recipientAddress);

			let outs: {
				amount:number,
				pubKey:string,
				output_idx_in_tx:number
			}[] = [];

			let derivation = null;
			try {
				// derivation = cnUtil.generate_key_derivation(tx_pub_key, wallet.keys.priv.view);//9.7ms
				derivation = CnUtilNative.generate_key_derivation(decodedAddress.view, txPrivKey);

				for(let iOut = 0; iOut < transaction.vout.length; ++iOut){
					try{
						let derived_out_key = CnUtilNative.derive_public_key(derivation, iOut, decodedAddress.spend);
						let found = transaction.vout[iOut].target.key == derived_out_key;

						console.log('iOut', iOut, found, transaction.vout[iOut].target.key, derived_out_key);
						let amount = transaction.vout[iOut].amount;
						if(found){
							if (amount !== 0) {//miner tx
							} else {
								let scalar1 = cnUtil.derivation_to_scalar(derivation, iOut);
								amount = CryptoUtils.decodeRctSimple(transaction.rct_signatures,
									scalar1,
									iOut,
									transaction.rct_signatures.outPk[iOut]);
								console.log(amount);
							}

							outs.push({
								amount:amount,
								pubKey:derived_out_key,
								output_idx_in_tx:iOut
							});

						}
					}catch(e){

					}
				}

			}catch(e){
			}

			return outs;
		}

	}

}