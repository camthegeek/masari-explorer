import {Block, BlockHeader, Daemon, DaemonInfo, NetworkStats, Transaction, UncleBlock} from "./repositories/Daemon";
import Utils from "./lib/horizon/Utils";
import {VueFilterBytes, VueFilterDate, VueFilterDifficulty, VueFilterPiconero} from "./filters/Filters";
import {SearchComponent} from "./controllers/Search";
import {VueClass, VueRequireComponent, VueRequireFilter, VueVar} from "./lib/horizon/VueAnnotate";

@VueClass()
@VueRequireFilter('piconero', VueFilterPiconero)
@VueRequireFilter('difficulty', VueFilterDifficulty)
@VueRequireFilter('date', VueFilterDate)
@VueRequireFilter('bytes', VueFilterBytes)
@VueRequireComponent(SearchComponent.name)
class IndexView extends Vue{
	protected daemon : Daemon;

	@VueVar(null) block !: Block|null;
	@VueVar(null) uncle !: UncleBlock|null;
	@VueVar(null) uncleReward !: number|null;

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
		let searchparameters = Utils.getSearchParameters();
		if(typeof searchparameters.height !== 'undefined'){
			this.loadBlockWithHeight(parseInt(searchparameters.height));
		}else if(typeof searchparameters.hash !== 'undefined'){
			this.loadBlockWithHash(searchparameters.hash);
		}

		this.daemon.getInfo().then((stats : DaemonInfo)=>{
			this.networkInfo = stats;
		});
	}

	loadBlockWithHeight(height : number){
		this.daemon.getBlockWithHeight(height).then((block : Block) => {
			this.block = block;
			console.log(block);
		});
	}

	loadBlockWithHash(hash : string){
		this.daemon.getBlockWithHash(hash).then((block : Block) => {
			if(block.block_header.orphan_status)//possible uncle
				this.loadUncle(hash).catch(()=>{
					this.block = block;
				});
			else
				this.block = block;
		}).catch(()=>{
			//the block can be an uncle
			this.loadUncle(hash);
		});
	}

	loadUncle(hash : string){
		return this.daemon.getUncleBlockWithHash(hash).then((uncle : UncleBlock)=>{
			//load the block referencing the uncle
			console.log('Uncle found:', uncle);
			this.daemon.getBlockWithHeight(uncle.json.miner_tx.vin[0].gen.height+1).then((block : Block)=>{
				this.uncle = uncle;
				this.block = block;

				this.daemon.getTransactionWithHash(block.miner_tx_hash).then((tx : Transaction) => {
					if(tx.as_json.vout.length >= 2){
						this.uncleReward = tx.as_json.vout[0].amount;
						for(let i = 1; i < tx.as_json.vout.length; ++i){
							if(tx.as_json.vout[i].amount < this.uncleReward){
								this.uncleReward = tx.as_json.vout[i].amount;
							}
						}
					}
				});
			});
		});
	}



}

new IndexView('#app');