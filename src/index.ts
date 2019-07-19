import {Block, BlockHeader, Daemon, DaemonInfo, MempoolTransaction, EmissionInfo, NetworkStats} from "./repositories/Daemon";
import {VueFilterBytes, VueFilterDate, VueFilterDifficulty, VueFilterHashrate, VueFilterPiconero} from "./filters/Filters";
import {Autowire} from "./lib/horizon/DependencyInjector";
import {SearchComponent} from "./controllers/Search";
import {VueClass, VueComputed, VueRequireComponent, VueRequireFilter, VueVar, VueWatched} from "./lib/horizon/VueAnnotate";

@VueClass()
@VueRequireFilter('piconero', VueFilterPiconero)
@VueRequireFilter('hashrate', VueFilterHashrate)
@VueRequireFilter('difficulty', VueFilterDifficulty)
@VueRequireFilter('date', VueFilterDate)
@VueRequireFilter('bytes', VueFilterBytes)
@VueRequireComponent(SearchComponent.name)
class IndexView extends Vue{
	@Autowire(Daemon.name) protected daemon !: Daemon;

	@VueVar({
		major_version:0,
		hash:'',
		reward:0,
		height:0,
		timestamp:0,
		difficulty:0,
		hashrate:0
	}) networkStats !: NetworkStats;

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

	@VueVar([]) blockHeaders !: BlockHeader[];
	@VueVar(0) serverTime !: number;
	@VueVar([]) txsInMempool !: MempoolTransaction[];
	@VueVar(true) loadingBlocks !: boolean;
	@VueVar(0) emissionInfo !: EmissionInfo;

	intervalRefresh = 0;

	constructor(container : string, vueConstructorData : VueConstructObject|null = null){
		super(vueConstructorData);

		this.intervalRefresh = setInterval(() => {
			this.refresh();
		}, 20*1000);
		this.refresh();
	}
	
	refresh(){
		this.loadServerTime();
		this.loadNetworkStats().then(()=>{
			if(this.blockHeaders.length <= 20)
				this.loadLastBlocks(20);
			this.loadingBlocks = false;
		});
		this.loadMempool();
	}

	loadServerTime(){
		this.daemon.getServerTime().then((time : number) => {
			this.serverTime = time;
		});
	}

	loadNetworkStats(){
		return Promise.all([
			this.daemon.getNetworkStats().then((stats : NetworkStats)=>{
				this.networkStats = stats;
			}),
			this.daemon.getInfo().then((stats : DaemonInfo)=>{
				this.networkInfo = stats;
			}),
			this.daemon.getEmission().then((emission : EmissionInfo) => { 
				console.log('this is emission: ' +emission);
				this.emissionInfo = emission;
			})
		]);
	}

	loadLastBlocks(blockCount : number){
		return this.daemon.getBlockHeader(this.networkStats.height-blockCount+1, this.networkStats.height).then((headers : BlockHeader[])=>{
			this.blockHeaders = headers.reverse();
		});
	}

	loadMempool(){
		this.daemon.getTransactionPool().then((txs : MempoolTransaction[]) => {
			txs.sort((a : MempoolTransaction, b : MempoolTransaction) => {
				return b.receive_time-a.receive_time;
			});
			this.txsInMempool = txs;
		});
	}

	loadMoreBlocks(blockCount : number = 20){
		let lastBlock = this.blockHeaders.length > 0 ? this.blockHeaders[this.blockHeaders.length-1].height : this.networkStats.height;

		this.loadingBlocks = true;
		return this.daemon.getBlockHeader(lastBlock-blockCount, lastBlock-1).then((headers : BlockHeader[])=>{
			for(let header of headers.reverse()){
				this.blockHeaders.push(header);
			}
			this.loadingBlocks = false;
		});
	}

	loadOlderBlocks(blockCount : number = 20){
		let lastBlock = this.blockHeaders.length > 0 ? this.blockHeaders[this.blockHeaders.length-1].height : this.networkStats.height;
		this.loadingBlocks = true;
		return this.daemon.getBlockHeader(lastBlock-blockCount < 0 ? 0 : lastBlock-blockCount, lastBlock-1).then((headers : BlockHeader[])=>{
			this.blockHeaders = headers.reverse();
			this.loadingBlocks = false;
		});
	}

	@VueComputed()
	getCanLoadOlder(){
		let lastBlock = this.blockHeaders.length > 0 ? this.blockHeaders[this.blockHeaders.length-1].height : this.networkStats.height;
		return lastBlock > 0;
	}

	loadNewerBlocks(blockCount : number = 20){
		let lastBlock = this.blockHeaders.length > 0 ? this.blockHeaders[0].height : this.networkStats.height;
		this.loadingBlocks = true;
		let maxHeight = this.networkInfo.height;
		if(lastBlock+blockCount > maxHeight)
			lastBlock = maxHeight-blockCount;
		return this.daemon.getBlockHeader(lastBlock+1, lastBlock+blockCount).then((headers : BlockHeader[])=>{
			this.blockHeaders = headers.reverse();
			this.loadingBlocks = false;
		});
	}

	@VueComputed()
	getCanLoadNewer(){
		let lastBlock = this.blockHeaders.length > 0 ? this.blockHeaders[0].height : this.networkStats.height;
		return lastBlock < this.networkStats.height;
	}

	@VueComputed()
	getAvgSolveTime(){
		let avg = 0;
		for(let i = 0; i < this.blockHeaders.length-1;++i){
			avg += this.blockHeaders[i].timestamp-this.blockHeaders[i+1].timestamp;
		}
		avg /= this.blockHeaders.length ? this.blockHeaders.length-1 : 1;
		return parseInt(''+avg);
	}

	@VueComputed()
	getCurrentHashrate(){
		return this.networkStats.difficulty/(this.networkInfo.target ? this.networkInfo.target : 1);
	}


	hashrateChart : any = null;

	@VueWatched()
	blockHeadersWatch(){
		let element : HTMLCanvasElement = <HTMLCanvasElement>document.getElementById('hashrateChart');
		let ctx = element ? element.getContext('2d') : null;
		if(ctx) {
			if(this.hashrateChart === null) {
				let hashrateValues = [];
				for(let blockHeader of this.blockHeaders){
					hashrateValues.push({
						x:blockHeader.height,
						y:Math.round(blockHeader.difficulty/(<any>window).config.avgBlockTime/1000)
					});
				}

				console.log(hashrateValues);
				(<any>window).Chart.defaults.global.defaultColor = '#2780E3';
				this.hashrateChart = new (<any>window).Chart(ctx, {
					type: 'line',
					data: {
						datasets: [{
							label: 'Hashrate',
							data: hashrateValues,
							borderColor: '#2780E3',
							borderWidth: 1
						}],
						labels: [],

					},
					options: {
						maintainAspectRatio: false,
						responsive: true,
						elements: {
							line: {
								tension: 0
							}
						},
						title: {
							display: false
						},
						legend: {
							display: false
						},
						tooltips: {
							callbacks: {
								label: (item : any) => `Hashrate: ${item.yLabel} KH`,
							},
						},
						scales: {
							yAxes: [{
								type: 'linear',
								distribution: 'linear',
								position: 'left',
								scaleLabel: {
									display: true,
									fontColor:'#c8c8c8',
									fontSize:13,
									labelString: 'NetHash (Kh/s)'
								},
								gridLines: {
									lineWidth: 1,
									display: true
								},
								ticks: {
									fontSize: 9,
									fontColor:'#c8c8c8',
									display: true
								},
								display: true,
							}],
							xAxes: [{
								type: 'linear',
								distribution: 'linear',
								position: 'left',
								scaleLabel: {
									display: false,
									labelString: 'Height'
								},
								gridLines: {
									display: false
								},
								ticks: {
									fontSize: 9,
									display: false,
									stepSize: 1
								},
								display: true
							}]
						}
					},

				});
				(<any>window).mychart = this.hashrateChart;
				// alert('ok');
			}else{
				for(let iBlockHeader = 0; iBlockHeader < this.blockHeaders.length; ++iBlockHeader){
					let blockHeader = this.blockHeaders[iBlockHeader];
					let point = {
						x: blockHeader.height,
						y: Math.round(blockHeader.difficulty/(<any>window).config.avgBlockTime/1000)
					};
					console.log(iBlockHeader, this.hashrateChart.data.datasets[0].data.length);
					if(iBlockHeader < this.hashrateChart.data.datasets[0].data.length) {
						this.hashrateChart.data.datasets[0].data[iBlockHeader] = point;
					}else{
						this.hashrateChart.data.datasets[0].data.push(point);
					}
				}
				console.log(this.hashrateChart.data.datasets[0].data);
				this.hashrateChart.update();
			}
		}
	}

}

new IndexView('#app');