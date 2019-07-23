<?php

include 'config.php';

if(
	!isset($_GET['hash'])
){
	http_response_code(400);
}else{
	header('Content-Type: application/json');
	
	$finalTransactions = array();
	$curl = curl_init();
	
	$body = json_encode(array('txs_hashes' => array($_GET['hash']), 'decode_as_json' => true));
	
	curl_setopt_array($curl, array(CURLOPT_RETURNTRANSFER => 1, CURLOPT_URL => 'http://' . $daemonAddress . ':' . $rpcPort . '/get_transactions', CURLOPT_POST => 1, CURLOPT_POSTFIELDS => $body));
	
	$resp = curl_exec($curl);
	
	$decodedJson = json_decode($resp, true);
	if($decodedJson !== null){
		foreach($decodedJson['txs'] as $key=>$tx){
			$txAsJson = json_decode($tx['as_json'], true);
			$decodedJson['txs'][$key]['as_json'] = $txAsJson;
			unset($decodedJson['txs'][$key]['as_json']['rctsig_prunable']);
			unset($decodedJson['txs'][$key]['rctsig_prunable']);
			//unset($decodedJson['txs'][$key]['as_hex']); commented out to enable tx.size in bytes
		}
		echo json_encode($decodedJson['txs']);
	}
	
	/*
	if(!isset($decodedJson['txs_as_json'])){
		$rawTransactionsJson = [];
		$rawTransactions = [];
	}else{
		$rawTransactionsJson = $decodedJson['txs_as_json'];
		$rawTransactions = $decodedJson['txs'];
	}
	
	//		var_dump($decodedJson['txs']);
	//		var_dump($rawTransactions);
	
	for($iTransaction = 0; $iTransaction < count($rawTransactionsJson); ++$iTransaction){
		$rawTransactionJson = $rawTransactionsJson[$iTransaction];
		$rawTransaction = $rawTransactions[$iTransaction];
		//			var_dump($txHashesMap[$txHashes[$iTransaction]].'<=>'.$height.'=>'.count($rawTransactions));
		//			if($txHashesMap[$txHashes[$iTransaction]] === $height){
		//				++$outCount;
		$finalTransaction = json_decode($rawTransactionJson, true);
		unset($finalTransaction['rctsig_prunable']);
		$finalTransaction['global_index_start'] = $outCount;
		$finalTransaction['ts'] = $rawTransaction['block_timestamp'];
		$finalTransaction['height'] = $height;
		$finalTransaction['hash'] = $rawTransaction['tx_hash'];
		//				var_dump('-->'.$txHashesMap[$txHashes[$iTransaction]]);
		$finalTransactions[] = $finalTransaction;
		
		$voutCount = count($finalTransaction['vout']);
		//								var_dump('vout of ' . $voutCount);
		$outCount += $voutCount;
		//			}
	}
	//		var_dump($outCount);*/
	$httpcode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
	
	
}