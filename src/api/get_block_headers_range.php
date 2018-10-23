<?php
/**
 * Created by IntelliJ IDEA.
 * User: Cedric
 * Date: 19/10/2018
 * Time: 09:43
 */

include 'config.php';

if(
	!isset($_GET['start_height']) ||
	!isset($_GET['end_height']) ||
	filter_var($_GET['start_height'], FILTER_VALIDATE_INT) === false ||
	filter_var($_GET['end_height'], FILTER_VALIDATE_INT) === false
){
	http_response_code(400);
}else{
	header('Content-Type: application/json');
	$curl = curl_init();
	
	$body = json_encode(array("jsonrpc" => "2.0", "id" => "0", "method" => "get_block_headers_range", "params" => array("start_height" => (int)$_GET['start_height'], "end_height" => (int)$_GET['end_height'],)));
	
	curl_setopt_array($curl, array(CURLOPT_RETURNTRANSFER => 1, CURLOPT_URL => 'http://' . $daemonAddress . ':' . $rpcPort . '/json_rpc', CURLOPT_POST => 1, CURLOPT_POSTFIELDS => $body));
	
	$resp = curl_exec($curl);
	curl_close($curl);
	$array = json_decode($resp, true);
	//var_dump($array);
	if($array === null) http_response_code(400);else{
		$blockHeader = $array['result']['headers'];
		echo json_encode($blockHeader);
	}
}


