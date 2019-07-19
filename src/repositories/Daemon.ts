export type NetworkStats = {
	majorVersion:number,
	hash:string,
	reward:string,
	height:number,
	timestamp:number,
	difficulty:number,
}

export type BlockHeader = {
	block_size:number,
	depth:number,
	difficulty:number,
	hash:string,
	height:number,
	major_version:number,
	minor_version:number,
	nonce:number,
	num_txes:number,
	orphan_status:boolean,
	prev_hash:boolean,
	reward:boolean,
	timestamp:number,
	uncle_status?:boolean,
	weight?:number,
}

export type Block = {
	block_header:BlockHeader,
	miner_tx_hash:string,
	blob:string,
	json:{
		major_version: number,
		miner_tx: {version: number, unlock_time: number, vin: any[], vout: any[], extra: number[]},
		minor_version: number,
		nonce: number,
		prev_id: string,
		timestamp: number,
		tx_hashes: string[],
		uncle?:string
	}
}

export type UncleBlock = {
	hash:string,
	blob:string,
	json:{
		major_version: number,
		miner_tx: {version: number, unlock_time: number, vin: any[], vout: any[], extra: number[], height:number},
		minor_version: number,
		nonce: number,
		prev_id: string,
		timestamp: number,
		tx_hashes: string[],
		uncle?:string,
		reward?:number,
	}
}

export type DaemonInfo = {
	alt_blocks_count: number,
	block_size_limit: number,
	block_size_median: number,
	bootstrap_daemon_address: string,
	cumulative_difficulty: number,
	difficulty: number,
	free_space: number,
	grey_peerlist_size: number,
	height: number,
	height_without_bootstrap: number,
	incoming_connections_count: number,
	mainnet: boolean,
	offline: boolean,
	outgoing_connections_count: number,
	rpc_connections_count: number,
	stagenet: boolean,
	start_time: number,
	status: 'OK',
	target: number,
	target_height: number,
	testnet: boolean,
	top_block_hash: string,
	tx_count: number,
	tx_pool_size: number,
	untrusted: boolean,
	version ?: string,
	was_bootstrap_ever_used: boolean,
	white_peerlist_size: number
}

export type TransactionJson = {
	extra:number[],
	rct_signatures:{
		type:number,
		txnFee: number,
		ecdhInfo:{mask:string, amount:string}[],
		outPk:string[],
		pseudoOuts:string[]
	},
	version: 1,
	unlock_time: 0,
	vin: {
		key?: {
			amount: number,
			k_image: string,
			key_offsets: number[]
		},
		gen?:{
			height:number
		}
	}[],
	vout:{
		amount:number,
		target:{
			key:string
		}
	}[]
}

export type Transaction = {
	as_json: TransactionJson,
	block_height: number
	block_timestamp: number
	double_spend_seen: boolean
	in_pool: boolean
	output_indices: number[]
	tx_hash:string
}

export type DaemonVersion = {
	version:number
};

export type MempoolTransaction = {
	blob_size: number,
	do_not_relay: boolean,
	double_spend_seen: boolean,
	fee: number,
	id_hash: string,
	kept_by_block: boolean,
	last_failed_height: number,
	last_failed_id_hash: string,
	last_relayed_time: number,
	max_used_block_height: number,
	max_used_block_id_hash: string,
	receive_time: number,
	relayed: boolean,
	tx_json:TransactionJson
}

export type EmissionInfo = {
	emission: number
}

export type SearchResultType = 'blockHeight'|'blockHash'|'transactionHash'|null;

export class Daemon{

	protected apiUrl = '';

	constructor(apiUrl : string = '') {
		this.apiUrl = './api/';
	}

	public getServerTime() : Promise<number>{
		return new Promise<number>((resolve, reject) => {
			$.ajax({
				url:this.apiUrl+'serverTime.php'
			}).done(function(data:any){
				resolve(data);
			}).catch(function(e : any){
				reject(e);
			});
		});
	}

	public getNetworkStats() : Promise<NetworkStats>{
		return new Promise<NetworkStats>((resolve, reject) => {
			$.ajax({
				url:this.apiUrl+'network.php'
			}).done(function(data:any){
				resolve(data);
			}).catch(function(e : any){
				reject(e);
			});
		});
	}

	public getBlockHeader(startHeight : number, endHeight : number) : Promise<BlockHeader[]> {
		return new Promise<BlockHeader[]>((resolve, reject) => {
			$.ajax({
				url:this.apiUrl+'get_block_headers_range.php?start_height='+startHeight+'&end_height='+endHeight
			}).done((data:any) => {
				let converted : BlockHeader[] = [];
				for(let row of data){
					converted.push(this.rawBlockHeaderToTyped(row));
				}

				resolve(converted);
			}).catch(function(e : any){
				reject(e);
			});
		});

	}

	public rawBlockHeaderToTyped(row : any) : BlockHeader{
		return {
			block_size:row.block_size,
			depth:row.depth,
			difficulty:row.difficulty,
			hash:row.hash,
			height:row.height,
			major_version:row.major_version,
			minor_version:row.minor_version,
			nonce:row.nonce,
			num_txes:row.num_txes,
			orphan_status:row.orphan_status,
			prev_hash:row.prev_hash,
			reward:row.reward,
			timestamp:row.timestamp,
		};
	}

	public getBlockWithHeight(height : number) : Promise<Block>{
		return new Promise<Block>((resolve, reject) => {
			$.ajax({
				url:this.apiUrl+'get_block.php?height='+height
			}).done(function(data:any){
				let block : Block = {
					block_header:data.block_header,
					miner_tx_hash:data.miner_tx_hash,
					blob:data.blob,
					json:JSON.parse(data.json)
				};
				resolve(block);
			}).catch(function(e : any){
				reject(e);
			});
		});
	}

	public getBlockWithHash(hash : string) : Promise<Block>{
		return new Promise<Block>((resolve, reject) => {
			$.ajax({
				url:this.apiUrl+'get_block.php?hash='+hash
			}).done(function(data:any){
				if(data === null)reject();
				else {
					let block: Block = {
						block_header: data.block_header,
						miner_tx_hash: data.miner_tx_hash,
						blob: data.blob,
						json: JSON.parse(data.json)
					};
					resolve(block);
				}
			}).catch(function(e : any){
				reject(e);
			});
		});
	}

	public getUncleBlockWithHash(hash : string) : Promise<UncleBlock>{
		return new Promise<UncleBlock>((resolve, reject) => {
			$.ajax({
				url:this.apiUrl+'get_uncle_block.php?hash='+hash
			}).done(function(data:any){
				if(data === null)reject();
				else {
					let block: UncleBlock = {
						hash:hash,
						blob: data.blob,
						json: JSON.parse(data.json)
					};
					resolve(block);
				}
			}).catch(function(e : any){
				reject(e);
			});
		});
	}

	public getTransactionWithHash(hash : string) : Promise<Transaction>{
		return new Promise<Transaction>((resolve, reject) => {
			$.ajax({
				url:this.apiUrl+'get_transactions.php?hash='+hash
			}).done(function(data:any){
				if(!data || data.length === 0)reject();
				else
					resolve(data[0]);
			}).catch(function(e : any){
				reject(e);
			});
		});
	}

	getVersion() : Promise<DaemonVersion>{
		return new Promise<DaemonVersion>((resolve, reject) => {
			$.ajax({
				url:this.apiUrl+'get_version.php'
			}).done(function(data:any){
				resolve(data);
			}).catch(function(e : any){
				reject(e);
			});
		});
	}

	getInfo() : Promise<DaemonInfo>{
		return new Promise<DaemonInfo>((resolve, reject) => {
			$.ajax({
				url:this.apiUrl+'get_info.php'
			}).done(function(data:any){
				resolve(data);
			}).catch(function(e : any){
				reject(e);
			});
		});
	}

	getTransactionPool() : Promise<MempoolTransaction[]>{
		return new Promise<MempoolTransaction[]>((resolve, reject) => {
			$.ajax({
				url:this.apiUrl+'get_transaction_pool.php'
			}).done(function(data:any){
				resolve(data);
			}).catch(function(e : any){
				reject(e);
			});
		});
	}

	public getEmission() : Promise<EmissionInfo>{
		return new Promise<EmissionInfo>((resolve, reject) => {
			$.ajax({
				url:this.apiUrl+'get_emission.php'
			}).done(function(data:any){
				resolve(data);
			}).catch(function(e : any){
				reject(e);
			});
		});
	}

	search(value : string) : Promise<SearchResultType>{
		value = value.trim();

		if(!isNaN(<any>value)){//blockchain height
			let result : SearchResultType = 'blockHeight';
			return Promise.resolve(result);
		}else{
			if(value.length === 64){
				return this.getBlockWithHash(value).then((block : Block) => {
					let result : SearchResultType = 'blockHash';
					return result;
				}).catch(() => {
					return this.getTransactionWithHash(value).then((tr : Transaction) => {
						let result : SearchResultType = 'transactionHash';
						return result;
					}).catch(() => {
						return this.getUncleBlockWithHash(value).then((uncle : UncleBlock) => {
							let result : SearchResultType = 'blockHash';
							return result;
						}).catch(() => {
							let result : SearchResultType = null;
							return result;
						});
					});
				});
			}else {
				let result : SearchResultType = null;
				return Promise.resolve(result);
			}
		}
	}

}