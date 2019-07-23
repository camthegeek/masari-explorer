import {Block, BlockHeader, Daemon, DaemonInfo, NetworkStats, Transaction, Members} from "./repositories/Daemon";
import Utils from "./lib/horizon/Utils";
import {Model} from "./model/TransactionDecoder";
import {CryptoUtils} from "./model/CryptoUtils";
import {VueFilterBytes, VueFilterDate, VueFilterOffsets, VueFilterPiconero} from "./filters/Filters";
import {SearchComponent} from "./controllers/Search";
import {VueClass, VueComputed, VueRequireComponent, VueRequireFilter, VueVar} from "./lib/horizon/VueAnnotate";
import TransactionDecoder = Model.TransactionDecoder;

@VueClass()
@VueRequireFilter('piconero', VueFilterPiconero)
@VueRequireFilter('date', VueFilterDate)
@VueRequireFilter('bytes', VueFilterBytes)
@VueRequireFilter('offsets', VueFilterOffsets)
@VueRequireComponent(SearchComponent.name)
class IndexView extends Vue{
	protected daemon : Daemon;

	@VueVar(null) transaction !: Transaction|null;
	@VueVar([]) blocks !: BlockHeader[];

	@VueVar('') txPubKey !: string;
	@VueVar('') extraAsHex !: string;
	@VueVar('') paymentId !: string;
	@VueVar('') encryptedPaymentId !: string;

	@VueVar('') publicAddress !: string;
	@VueVar('') privateViewKey !: string;
	@VueVar('') transactionPrivateKey !: string;

	@VueVar([]) decodedOuts !: {amount:number, pubKey : string}[];
	@VueVar(false) showProveReceived !: boolean;
	@VueVar([]) membersX !: Members[];

	@VueVar({
		alt_blocks_count: 0,
		block_size_limit: 0,
		block_size_median: 0,
		bootstrap_daemon_address: '',
		cumulative_difficulty: 0,
		difficulty: 0,
		free_space: 0,
		grey_peerlist_size: 0,
		height: 0,
		height_without_bootstrap: 0,
		incoming_connections_count: 0,
		mainnet: true,
		offline: false,
		outgoing_connections_count: 0,
		rpc_connections_count: 0,
		stagenet: false,
		start_time: 0,
		status: 'OK',
		target: 0,
		target_height: 0,
		testnet: false,
		top_block_hash: '',
		tx_count: 0,
		tx_pool_size: 0,
		untrusted: 0,
		version: undefined,
		was_bootstrap_ever_used: false,
		white_peerlist_size: 0
	}) networkInfo !: DaemonInfo;

	constructor(container : string, vueConstructorData : VueConstructObject|null = null){
		super(vueConstructorData);

		this.daemon = new Daemon();

		setInterval(() => {
			this.refresh();
		}, 20*1000);
		this.refresh();

	}

	refresh(){
		let searchparameters = Utils.getSearchParameters();
		if(typeof searchparameters.hash !== 'undefined'){
			this.loadTransactionWithHash(searchparameters.hash);
		}

		this.daemon.getInfo().then((stats : DaemonInfo)=>{
			this.networkInfo = stats;
		});
	}
	
	loadTransactionWithHash(hash : string){
		this.daemon.getTransactionWithHash(hash).then((transaction : Transaction) => {
			this.transaction = transaction;

			this.daemon.getBlockHeader(this.transaction.block_height,this.transaction.block_height).then((blockHeader : BlockHeader[]) => {
				this.blocks = blockHeader;
			});

			let extras = Model.TransactionDecoder.parseExtra(this.transaction.as_json.extra);
			for(let extra of extras){
				if(extra.type === Model.TX_EXTRA_TAG_PUBKEY){
					this.txPubKey = '';
					for(let i = 0; i < extra.data.length; ++i)
						this.txPubKey += String.fromCharCode(extra.data[i]);
					this.txPubKey = CryptoUtils.bintohex(this.txPubKey);
				}else if(extra.type === Model.TX_EXTRA_NONCE){
					if (extra.data[0] === Model.TX_EXTRA_NONCE_PAYMENT_ID) {
						this.paymentId = '';
						for (let i = 1; i < extra.data.length; ++i) {
							this.paymentId += String.fromCharCode(extra.data[i]);
						}
						this.paymentId = CryptoUtils.bintohex(this.paymentId);
					} else if (extra.data[0] === Model.TX_EXTRA_NONCE_ENCRYPTED_PAYMENT_ID) {
						this.encryptedPaymentId = '';
						for (let i = 1; i < extra.data.length; ++i) {
							this.encryptedPaymentId += String.fromCharCode(extra.data[i]);
						}
						this.encryptedPaymentId = CryptoUtils.bintohex(this.encryptedPaymentId);
					}

				}
			}

			this.extraAsHex = '';
			for(let i = 0; i < this.transaction.as_json.extra.length; ++i)
				this.extraAsHex += String.fromCharCode(this.transaction.as_json.extra[i]);
			this.extraAsHex = CryptoUtils.bintohex(this.extraAsHex);
		});
	}

	/*@VueComputed()
	getTxOutputs() {
		let returnVal = [];
		if(this.transaction) {
		try {
			for(let keys of this.transaction.as_json.vin) {
				let kimages = keys.key!.k_image;
				let offsets = keys.key!.key_offsets;
				let group = [];
				let amountZ:number = 0;		
				for (let i=0; i<offsets.length; i++) {
					amountZ += offsets[i];
					group.push(amountZ);
				}
				this.daemon.getTransactionOuts(group.toString(), kimages).then((members) => {
					this.membersX = members;
				});
				returnVal.push(this.membersX);
			}
		} catch(e){
		return '-';
		}
				return returnVal;
}
	}
*/
	@VueComputed()
	getSumOutputs(){
		let sum = 0;
		if(this.transaction)
			for(let output of this.transaction.as_json.vout){
				sum += output.amount;
			}
		for(let output of this.decodedOuts){
			sum += output.amount;
		}
		return sum;
	}

	@VueComputed()
	getMixinCount(){
		if(this.transaction && this.transaction.as_json.vin.length) {
			let key = this.transaction.as_json.vin[0].key;
			if (key) {
				return this.transaction.as_json.vin.length ? key.key_offsets.length - 1 : 0;
			}
		}

		return 0;
	}

	@VueComputed()
	getVinLength(){
		if(this.transaction && this.transaction.as_json.vin.length) {
			let key = this.transaction.as_json.vin[0].key;
			if (key) {
				return this.transaction.as_json.vin.length;
			}
		}

		return 0;
	}

	proveOwnership(){
		if(this.transaction) {
			this.decodedOuts = [];
			try {
				let keysFromPubAddress = cnUtil.decode_address(this.publicAddress.trim());

				let decoded = TransactionDecoder.parse(this.transaction.as_json, {
					view: {
						priv: this.privateViewKey,
						pub: keysFromPubAddress.view,
					},
					spend: {
						pub: keysFromPubAddress.spend,
					}
				});
				this.decodedOuts = decoded;
				this.showProveReceived = false;
				if(decoded.length === 0)
					alert('Nothing match');
				else
					window.location.href = '#outputs';
			}catch(e){
				alert('Invalid keys');
			}
		}
	}

	proveSending(){
		if(this.transaction) {
			this.decodedOuts = [];
			try {
				let decoded = TransactionDecoder.proveSent(this.transactionPrivateKey,this.publicAddress.trim(),this.transaction.as_json);
				this.decodedOuts = decoded;
				this.showProveReceived = false;
				if(decoded.length === 0)
					alert('Nothing match');
				else
					window.location.href = '#outputs';
			}catch(e){
				alert('Invalid keys');
			}
		}
	}

	@VueComputed()
	getIsPublicAddressValid(){
		if(this.publicAddress.trim().length === 0)
			return true;
		try {
			cnUtil.decode_address(this.publicAddress.trim());
			return true;
		}catch(e){
			return false;
		}
	}

	@VueComputed()
	getIsPrivateViewKeyValid(){
		return this.privateViewKey.trim().length === 64;
	}


}

new IndexView('#app');