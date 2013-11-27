#!/bin/env node
////
//// OpenShift sample Node application.
//// Working to peel it away from the packaged example.
////

///
/// Bring in libs and namespaces.
///

// Required Node libs.
var express = require('express');
var mustache = require('mustache');
var fs = require('fs');

// Required add-on libs.
var bbop = require('bbop').bbop;
var amigo = require('amigo').amigo;

// Figure out our base and URLs we'll need to aim this locally.
var linker = new amigo.linker();
var medial_query = linker.url('', 'medial_search');
var sd = new amigo.data.server();
var app_base = sd.app_base();

///
/// Define the sample application.
///

var AmiGOOpenSearch = function() {

    var self = this;

    ///
    /// Environment helpers.
    ///

    // Set up server IP address and port # using env variables/defaults.
    // WARNING: Port stuff gets weird: https://www.openshift.com/forums/openshift/nodejs-websockets-sockjs-and-other-client-hostings
    self.setupVariables = function() {

	var non_std_local_port = 8910;

	self.IS_ENV_OPENSHIFT = false;
	self.IS_ENV_HEROKU = false;
	self.IS_ENV_LOCAL = false;

	if( process.env.OPENSHIFT_APP_DNS ){
	    self.IS_ENV_OPENSHIFT = true;	    

            self.ipaddress = process.env.OPENSHIFT_NODEJS_IP;
            self.port = process.env.OPENSHIFT_NODEJS_PORT;
	    self.hostport = process.env.OPENSHIFT_APP_DNS;

            console.warn('OPENSHIFT_NODEJS');
	}else if( process.env.PORT ){
	    self.IS_ENV_HEROKU = true;

            self.port = process.env.PORT || non_std_local_port;

	    bbop.core.each(process.env, 
			   function(key,val){
			       console.log(key + ':' + val);
			   });

            console.warn('HEROKU_NODEJS');
	}else{
	    self.IS_ENV_LOCAL = true;

            self.ipaddress = "127.0.0.1";
            self.port = non_std_local_port;
	    self.hostport = self.hostport + ':' + non_std_local_port;	    

            console.warn('LOCAL_NODEJS');
	}
    };

    ///
    /// Various static document helpers.
    ///

    // GO logo as base64 png.
    self.static_logo = function(){

	var logo_png_data = 'base64,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%3D%3D';
	var logo_png_b64 = 'data:image/png;' + logo_png_data;

	return logo_png_b64;
    };

    // Default top-level page. Just say "hi!"
    self.static_index = function(){

	var indexdoc = [
	    '<html>',
	    '<head>',// profile="http://a9.com/-/spec/opensearch/1.1/">',
	    '<meta charset="utf-8">',
	    '<link rel="icon" href="' + self.static_logo() + '" />',
	    '<link',
	    'rel="search"',
	    'type="application/opensearchdescription+xml"',
	    'href="http://' + self.hostport + '/osd_term.xml"',
	    'title="GO Search (term)" />',
	    '<link',
	    'rel="search"',
	    'type="application/opensearchdescription+xml"',
	    'href="http://' + self.hostport + '/osd_gp.xml"',
	    'title="GO Search (gene product)" />',
	    '</head>',
	    '<body>',
	    '<p>',
	    'Hello, World!',
	    '</p>',
	    '<p>',
	    'If you know how to find it in your browser,',
	    'an OpenSearch plug-in should now be available.',
	    '</p>',
	    '</body>',
	    '</html>'
	].join(' ');
	return indexdoc;
    };

    self.static_osd = function(type){

	// Use mustache for XML generation.
	var osddoc_tmpl = [
	    '<?xml version="1.0" encoding="UTF-8"?>',
	    '<OpenSearchDescription',
	    'xmlns:moz="http://www.mozilla.org/2006/browser/search/"',
	    'xmlns="http://a9.com/-/spec/opensearch/1.1/">',
	    '<ShortName>GO OpenSearch ({{readable_type}})</ShortName>',
	    '<Description>GO OpenSearch for {{readable_type}}s.</Description>',
	    '<Tags>example golr bbop go gene ontology {{readable_type}}</Tags>',
            '<Contact>sjcarbon@lbl.gov</Contact>',
	    '<Image width="16" height="16" type="image/png">'+ self.static_logo() +'</Image>',
	    '<Url',
            'type="text/html"',
            'method="GET"',
	    // 'template="' + medial_query + '{searchTerms}" />',
            'template="http://amigo2.berkeleybop.org/cgi-bin/amigo2/amigo/medial_search?q={searchTerms}" />',
            '<Url',
            'type="application/x-suggestions+json"',
            'template="http://' + self.hostport + '/{{type}}/{searchTerms}" />',
            // '<moz:SearchForm>' + app_base + '</moz:SearchForm>',
            '<moz:SearchForm>http://amigo2.berkeleybop.org/</moz:SearchForm>',
            '</OpenSearchDescription>'
	].join(' ');

	var tmpl_args = {
	    'type': '???',
	    'readable_type': '?'
	};
	if( type == 'term' ){
	    tmpl_args = {
		'type': 'term',
		'readable_type': 'term'
	    };
	}else if( type == 'gene_product' ){
	    tmpl_args = {
		'type': 'gene_product',
		'readable_type': 'gene product'
	    };
	}
	return mustache.to_html(osddoc_tmpl, tmpl_args);
    };

    ///
    /// Response helper.
    ///
    
    self.standard_response = function(res, code, type, body){
	res.setHeader('Content-Type', type);
	res.setHeader('Content-Length', body.length);
	res.end(body);
	return res;
    };

    ///
    /// Cache helpers.
    ///

    //  Populate the cache.
    self.populateCache = function() {
        if( typeof self.zcache === "undefined" ){
            self.zcache = { 'index.html': '' };
        }

        // Local cache for static content.
        self.zcache['index.html'] = fs.readFileSync('./html/index.html');
    };

    // Retrieve entry (content) from cache.
    // @param {string} key  Key identifying content to retrieve from cache.
    self.cache_get = function(key) {
	return self.zcache[key];
    };

    // terminator === the termination handler
    // Terminate server on receipt of the specified signal.
    // @param {string} sig  Signal to terminate on.
    self.terminator = function(sig){
        if (typeof sig === "string") {
           console.log('%s: Received %s - terminating sample app ...',
                       Date(Date.now()), sig);
           process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()) );
    };

    // Setup termination handlers (for exit and a list of signals).
    self.setupTerminationHandlers = function(){
        //  Process on exit and signals.
        process.on('exit', function() { self.terminator(); });

        // Removed 'SIGPIPE' from the list - bugz 852598.
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() { self.terminator(element); });
        });
    };

    ///
    /// App server functions (main app logic here).
    ///

    // Initialize the server (express) and create the routes and register
    // the handlers.
    self.initializeServer = function() {
        //self.createRoutes();
        self.app = express();

	///
	/// Static routes.
	///

	// Cached static routes.
        self.app.get('/index.html', function(req, res) {
			 res.setHeader('Content-Type', 'text/html');
			 res.send(self.cache_get('index.html') );
		     });

	// Internal static routes.
	self.app.get('/',
		     function(req, res){
			 self.standard_response(res, 200, 'text/html',
						self.static_index());
		     });
	self.app.get('/osd_term.xml',
		     function(req, res){
			 self.standard_response(res, 200, 'application/xml',
						self.static_osd('term'));
		     });
	self.app.get('/osd_gp.xml',
		     function(req, res){
			 self.standard_response(res, 200, 'application/xml',
						self.static_osd('gene_product'));
		     });
	// TODO: This obviously does not do anything than supress some types
	// of error messages.
	self.app.get('/favicon.ico',
		     function(req, res){
			 self.standard_response(res, 200, 'image/x-icon', '');
		     });

	///
	/// Dynamic OpenSearch components/routes.
	///

	// Define the GOlr request conf.
	var server_loc = 'http://golr.berkeleybop.org/';
	var gconf = new bbop.golr.conf(amigo.data.golr);

	// The request functions I use are very similar.
	function create_request_function(personality, doc_type,
					 id_field, label_field, link_type){

	    return function(req, res) {

		//console.log(req.route);
		//console.log(req.route.params['query']);
		var query = req.route.params['query'] || '';

		// Try AmiGO 2 action.
		var go = new bbop.golr.manager.nodejs(server_loc, gconf);
		go.set_personality(personality); // profile in gconf
		go.add_query_filter('document_category', doc_type);

		// Define what we do when our GOlr (async) information
		// comes back within the scope of the response we need to end.
		function golr_callback_action(gresp){

		    // Return caches for the values we'll collect.
		    var ret_terms = [];
		    var ret_descs = [];
		    var ret_links = [];

		    // Gather document info if available.
		    //var found_docs = gresp.documents();		
		    bbop.core.each(gresp.documents(),
				   function(doc){
				       var id = doc[id_field];
				       var label = doc[label_field];

				       ret_terms.push(label);
				       ret_descs.push(id);
				       ret_links.push(linker.url(id,link_type));
				   });

		    // Assemble final answer into the OpenSearch JSON
		    // form.
		    var ret_body = [query];
		    ret_body.push(ret_terms);
		    ret_body.push(ret_descs);
		    ret_body.push(ret_links);

		    // Back to res?
		    //console.log('send response');
		    self.standard_response(res, 200, 'application/json',
	    				   bbop.core.to_string(ret_body));
		    //console.log('send response');
		}

		// Run the agent action.
		go.set_comfy_query(query);
		go.register('search', 'do', golr_callback_action);
		go.update('search');
		//console.log('update: search');
	    };
	}

	// Dynamic GOlr output.
	self.app.get('/term/:query',
		     create_request_function('ontology', 'ontology_class',
					     'annotation_class', 'annotation_class_label',
					     'term'));
	self.app.get('/gene_product/:query',
		     create_request_function('bioentity', 'bioentity',
					     'bioentity', 'bioentity_label',
					     'gene_product'));
    };

    // Initializes the sample application.
    self.initialize = function() {
        self.setupVariables();
        self.populateCache();
        self.setupTerminationHandlers();

        // Create the express server and routes.
        self.initializeServer();
    };

    // Start the server (starts up the sample application).
    // Either in Heroku, Openshift, or various local.
    self.start = function() {
	if( self.IS_ENV_HEROKU ){
	    // Heroku seems to want a more minimal launch.
	    self.app.listen(self.port,
			    function() {
				console.log('%s: Node started on %s:%d ...',
					    Date(Date.now()),
					    self.ipaddress || '???',
					    self.port);
			    });
	}else{
            // Start the app on the specific interface (and port).
            self.app.listen(self.port, self.ipaddress,
			    function() {
				console.log('%s: Node started on %s:%d ...',
					    Date(Date.now()),
					    self.ipaddress,
					    self.port);
			    });
	}
    };
};

///
/// Main.
///

var goo = new AmiGOOpenSearch();
goo.initialize();
goo.start();
