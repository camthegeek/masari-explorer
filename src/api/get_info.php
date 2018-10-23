<?php
/**
 * Created by IntelliJ IDEA.
 * User: Cedric
 * Date: 19/10/2018
 * Time: 10:11
 */

include 'config.php';

$curl = curl_init();

header('Content-Type: application/json');

$body = json_encode(array("jsonrpc" => "2.0", "id" => "0", "method" => "get_info"));

curl_setopt_array($curl, array(CURLOPT_RETURNTRANSFER => 1, CURLOPT_URL => 'http://' . $daemonAddress . ':' . $rpcPort . '/json_rpc', CURLOPT_POST => 1, CURLOPT_POSTFIELDS => $body));

$resp = curl_exec($curl);
curl_close($curl);
$array = json_decode($resp, true);
if($array === null)
	http_response_code(400);
else{
	$blockHeader = $array['result'];
	echo json_encode($blockHeader);
}