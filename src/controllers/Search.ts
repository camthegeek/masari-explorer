import {Autowire, DependencyInjectorInstance} from "../lib/horizon/DependencyInjector";
import {Daemon, SearchResultType} from "../repositories/Daemon";
import {VueComponentAutoRegister, VueVar} from "../lib/horizon/VueAnnotate";

@VueComponentAutoRegister('search')
export class SearchComponent{

	@VueVar('') searchValue !: string;
	@VueVar(false) searching !: boolean;

	template = `
<div class="searchBox">
	<input type="text" placeholder="Search by height, tx hash, block hash" v-model="searchValue"/><button @click="search()" :disabled="searching"><i class="fa fa-search fa-fw" aria-hidden="true"></i> Search</button>
</div>
	`;

	search(){
		this.searching = true;
		let daemon  : Daemon = DependencyInjectorInstance().getInstance(Daemon.name);
		daemon.search(this.searchValue).then((type : SearchResultType) => {
			if(type === 'transactionHash')
				window.location.href = 'transaction.html?hash='+this.searchValue.trim();
			else if(type === 'blockHash')
				window.location.href = 'block.html?hash='+this.searchValue.trim();
			else if(type === 'blockHeight')
				window.location.href = 'block.html?height='+this.searchValue.trim();
			else{
				alert('No block nor transaction found with this value');
			}
			this.searching = false;
		});
	}

}