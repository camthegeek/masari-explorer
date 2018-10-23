<?php
/**
 * Created by IntelliJ IDEA.
 * User: Cedric
 * Date: 19/10/2018
 * Time: 09:43
 */

include 'config.php';

if(
	(
		!isset($_GET['height']) ||
		filter_var($_GET['height'], FILTER_VALIDATE_INT) === false
	)
	 &&
	!isset($_GET['hash'])
){
	http_response_code(400);
}else{
	header('Content-Type: application/json');
	$curl = curl_init();
	
	if(isset($_GET['hash']))
		$body = json_encode(array("jsonrpc" => "2.0", "id" => "0", "method" => "get_block", "params" => array("hash" => $_GET['hash'])));
	else
		$body = json_encode(array("jsonrpc" => "2.0", "id" => "0", "method" => "get_block", "params" => array("height" => (int)$_GET['height'])));
	
	curl_setopt_array($curl, array(CURLOPT_RETURNTRANSFER => 1, CURLOPT_URL => 'http://' . $daemonAddress . ':' . $rpcPort . '/json_rpc', CURLOPT_POST => 1, CURLOPT_POSTFIELDS => $body));
	
	$resp = curl_exec($curl);
	curl_close($curl);
	$array = json_decode($resp, true);
	//var_dump($array);
	if($array === null) http_response_code(400);else{
		$blockHeader = $array['result'];
		echo json_encode($blockHeader);
	}
}


