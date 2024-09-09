Why make an SN Request Class?

What does it give us? At least within our application, it gives us the ability to pass in a structured config, and evaluate how it's configured and setup the basics..

Then we can have setuff like...?

//maybe what I was missing before, was going something like...

var snReq = new SNRequest(tableName, SNRequestConfig);

snReq.setTableName(tableName); //this way you can initialize once, and get multiple times..
snReq.setConfig(SNRequestConfig);
snReq.retrieveFields([...field_names]);
snReq.displayValue(true | false | 'both(All?)');
snReq.excludeReferenceLink(boolean);
snReq.addQuery(); //this will be a very very basic shim...
snReq.addEncodedQuery(encodedQuery);
snReq.setLimit(10);


//then at some point we can...

snReq.query(); //This will execute the API Call... do we use an iterable here? do we return an iterable? this way we can page through results?


query(query, fields, {...config});
get(sys_id);
inser


var rMsg = sn_ws.RESTMessage(?SNRequestConfig); //basically a passthrough for NodeFetch, or can use the methods provided?
rMsg.setEndpoint('thefullendpoint');
rMsg.setHttpMethod('GET');


NOWRecord(tableName, SNRequestConfig) extends SNAPI ...
