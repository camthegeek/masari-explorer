
export default class Utils{

	private static transformSearchParametersToAssocArray(prmstr:any) {
		let params : any = {};
		let prmarr = prmstr.split("&");
		for (let i = 0; i < prmarr.length; i++) {
			let tmparr = prmarr[i].split("=");
			if(typeof params[tmparr[0]] !== 'undefined'){
				if(!Array.isArray(params[tmparr[0]]))
					params[tmparr[0]] = [params[tmparr[0]]];
				params[tmparr[0]].push(tmparr[1]);
			}else
				params[tmparr[0]] = tmparr[1];
		}
		return params;
	}

	static getSearchParameters() {
		let paramsStart = window.location.href.indexOf('?');
		if (paramsStart != -1) {
			let paramsEnd = window.location.href.indexOf('#', paramsStart);
			paramsEnd = paramsEnd == -1 ? window.location.href.length : paramsEnd;
			return Utils.transformSearchParametersToAssocArray(window.location.href.substring(paramsStart + 1, paramsEnd));
		}
		return {};
	}

	static getHashSearchParameters() {
		let paramsStart = window.location.hash.indexOf('?');
		if (paramsStart != -1) {
			return Utils.transformSearchParametersToAssocArray(window.location.href.substring(paramsStart + 1, window.location.href.length));
		}
		return {};
	}

}