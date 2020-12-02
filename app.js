var express = require('express');
const app = express();
let request = require('request');
let axios = require('axios');
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false })    
let cors = require('cors')
var compression = require('compression')
var cache = require('memory-cache');
let fs = require('fs')
const cron = require("node-cron");
const path = require('path');
const port = process.env.PORT || 3000;
app.use(compression())
app.use(cors())

const router = express.Router();

const imageToBase64 = require('image-to-base64');

app.use("/assets", express.static(__dirname + '/assets'));

app.use(bodyParser.urlencoded({
    limit: '500mb',
    extended: true,
    parameterLimit: 50000
  }));

app.use(bodyParser.json());

// configure cache middleware
let memCache = new cache.Cache();
let cacheMiddleware = (duration) => {
    return (req, res, next) => {
        let key =  '__express__' + req.originalUrl || req.url
        let cacheContent = memCache.get(key);
        if(cacheContent){
            res.send( cacheContent );
            return
        }else{
            res.sendResponse = res.send
            res.send = (body) => {
                memCache.put(key,body,duration*1000);
                res.sendResponse(body)
            }
            next()
        }
    }
}

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname + '/index.html'));
});

app.get('/home', function(req, res) {
  res.sendFile(path.join(__dirname + '/home.html'));
});

app.get('/terms_condition', function(req, res) {
  res.sendFile(path.join(__dirname + '/profile.html'));
});

app.get('/download_all_data/:project/:project_form/:token',cors(), function (req, res) {
  
  const token = req.params.token;
  const project = req.params.project;
  const project_form = req.params.project_form;


  var options = {
    'method': 'GET',
    'url': 'https://odk-server.icipe.org/v1/projects/'+ project +'/forms/'+ project_form +'/submissions.csv.zip',
    'headers': {
      'Authorization': 'Bearer '+ token +''
    }
  };


  request(options, function (error, response) {

    if (error) throw new Error(error);
    //res.send(response.body);

    res.end(response.body);

    //console.log('https://odk-server.icipe.org/v1/projects/'+ project +'/forms/'+ project_form +'/submissions.csv.zip');

   // const downloadName = ''+ project_form +' .zip';     
    //const data = zip.toBuffer();
    //res.set('Content-Type','application/octet-stream');
    //res.set('Content-Disposition',`attachment; filename=${downloadName}`);
   // res.set('Content-Length',data.length);
   // res.download(downloadName);


  });
});


//Get GeoJson as API
app.post('/user_authenticate',urlencodedParser, cors(), function (req, res) {
  
    const email = req.body.email;
    const password = req.body.password;

    var options = {
        'method': 'POST',
        'url': 'https://odk-server.icipe.org/v1/sessions',
        'headers': {
            'Content-Type': 'application/json',
            'Authorization': 'Basic anRhbnVpQGljaXBlLm9yZzpBcmMxMC42R0lT',
            'Cookie': '__Host-session=j9Us3EY2eUkdkExL08rNOv07Ov4c3wc89SDyqfYgzccq68!29H3ZCuvE6VzKtp3K; __csrf=ZfbhOoDY6zH934s0jFXIqg!QduCbxWLAnwkjpwezYBf7FApDuwI3RDFDAn94XBJN'
        },
        body: JSON.stringify({"email":""+ email +"","password":"" + password +""})
    };

    request(options, function (error, response) {

        if (error) {

            res.send(JSON.parse(error));

        } else {

            res.send(JSON.parse(response.body));

        }
    });
});

app.get('/authenticated_images/:project/:project_form/:uuid/:photo/:token', function (req, res) {

  var project = req.params.project;
  var project_form = req.params.project_form;
  var token = req.params.token;
  var uuid = req.params.uuid;
  var photo = req.params.photo;


  const request1 = require('request').defaults({ encoding: null });

  var main_uri = 'https://odk-server.icipe.org/v1/projects/'+ project +'/forms/'+ project_form +'/submissions/'+ uuid +'/attachments/'+ photo +'';

  
  var options = {
    'method': 'GET',
    'url': 'https://odk-server.icipe.org/v1/projects/'+ project +'/forms/'+ project_form +'/submissions/'+ uuid +'/attachments/'+ photo +'',
    'responseType': 'arraybuffer',
    'headers': {
      'Authorization': 'Bearer '+ token +'',
    }
  };
  request1(options, function (error, response, body) {
    if (error){

    } else {
      var json_obj = JSON.stringify(response.body);

     // console.log(JSON.stringify(json_obj));

      //var img = "data:image/png;base64,"+json_obj;
      //var ext = img.split(';')[0].match(/jpeg|png|gif/)[0];
      //var data = img.replace(/^data:image\/\w+;base64,/, "");
      //var buf = new Buffer(img);
      
     // res.writeHead(200, {'Content-Type': 'image/jpeg'});

      // var vals = (new Buffer(json_obj)).toString('base64')

      //  res.end("" + "<img src=\"data:image/jpg;base64," + vals + "\" />" + "");
     
     // var img = new Buffer(json_obj, 'binary').toString('base64')
     // res.writeHead(200, {
      //  'Content-Type': 'image/png',
      //  'Content-Length': img.length
      //});

      //res.send('https://odk-server.icipe.org/v1/projects/'+ project +'/forms/'+ project_form +'/submissions/'+ uuid +'/attachments/'+ photo +'');
     
      //  console.log('https://odk-server.icipe.org/v1/projects/'+ project +'/forms/'+ project_form +'/submissions/'+ uuid +'/attachments/'+ photo +'');

      //var base64Image = new Buffer(json_obj, 'binary').toString('base64');
      //res.send('data:image/jpeg;base64,' + base64Image);

      //console.log('error:', error);
      //console.log('statusCode:', response && response.statusCode);
      //console.log(response.headers['content-type']);
      //console.log(body);
    
      //res.send({ imageData: body})
      
      //res.send(base64Image);

      // console.log(data);

    }
  });

  
});

app.get('/current_user_details/:token', function (req, res) {
  
    var token = req.params.token;

    var options = {
        'method': 'GET',
        'url': 'https://odk-server.icipe.org/v1/users/current',
        'headers': {
          'Authorization': 'Bearer '+ token +'',
        }
      };
      request(options, function (error, response) {
        if (error) {

            res.send(JSON.parse(error));

        } else {

            res.send(JSON.parse(response.body));

        }
      });
    
});

app.get('/get_all_project_map_data/:project_id/:form_id/:token', cors(), function (req, res) {
  
  var token = req.params.token;
  var project_id = req.params.project_id;
  var form_id = req.params.form_id;

  var options = {
      'method': 'GET',
      'url': 'https://odk-server.icipe.org/v1/projects/'+ project_id +'/forms/'+ form_id +'.svc/Submissions',
      'headers': {
        'Authorization': 'Bearer '+ token +'',
      }
    };
    request(options, function (error, response) {

      if (error) {

          res.send(JSON.parse(error));

      } else {

         // console.log(JSON.parse(response.body.value));

         let json_obj2;
         var objj = [];

         var json_obj = JSON.parse(response.body);
         json_obj2 = json_obj.value.length;

         if(json_obj2 != 0){

         for(var i = 0; i < json_obj2; i++) {
          var obj = json_obj.value[i];
          
         // console.log(obj.hasOwnProperty('gps'));

          delete obj.survey_description;
          delete obj.__system
          delete obj.meta

           objj.push(obj);
          

         }
         }

         res.send(objj);

      }
      
    });
  
});

app.get('/get_all_project_data/:project_id/:form_id/:token', cors(), function (req, res) {
  
    var token = req.params.token;
    var project_id = req.params.project_id;
    var form_id = req.params.form_id;

    var options = {
        'method': 'GET',
        'url': 'https://odk-server.icipe.org/v1/projects/'+ project_id +'/forms/'+ form_id +'.svc/Submissions',
        'headers': {
          'Authorization': 'Bearer '+ token +'',
        }
      };
      request(options, function (error, response) {

        if (error) {

            res.send(JSON.parse(error));

        } else {

           // console.log(JSON.parse(response.body.value));


           var json_obj = JSON.parse(response.body);
           var json_obj2 = json_obj.value.length;
           console.log(json_obj.value.length);
            var objj = [];

            
           if(json_obj2 !== undefined){

            for(var i = 0; i < json_obj2; i++) {
              var obj = json_obj.value[i];
              
             // console.log(obj.hasOwnProperty('gps'));
  
              delete obj.survey_description;
              //delete obj.__id;
              delete obj.gps;
              delete obj.__system
              delete obj.meta
  
               objj.push(obj);
              
  
             }
  
          
              res.send(objj);
  
            
          }
        }
        
      });
    
});

app.get('/get_all_projects_forms/:project_id/:token', cors(), function (req, res) {
  
    var token = req.params.token;
    var project_id = req.params.project_id;

    var options = {
        'method': 'GET',
        'url': 'https://odk-server.icipe.org/v1/projects/'+ project_id +'/forms',
        'headers': {
          'X-Extended-Metadata': 'true',
          'Authorization': 'Bearer '+ token +'',
        }
      };
      request(options, function (error, response) {

        if (error) {

            res.send(JSON.parse(error));

        } else {

            res.send(JSON.parse(response.body));

        }

      });
    
});

app.get('/get_all_projects_collectors/:project_id/:token', cors(), function (req, res) {
  
    var token = req.params.token;
    var project_id = req.params.project_id;

    var options = {
        'method': 'GET',
        'url': 'https://odk-server.icipe.org/v1/projects/'+ project_id +'/app-users',
        'headers': {
          'X-Extended-Metadata': 'true',
          'Authorization': 'Bearer '+ token +'',
        }
      };
      request(options, function (error, response) {

        if (error) {

            res.send(JSON.parse(error));

        } else {

            res.send(JSON.parse(response.body));

        }

      });
    
});

app.get('/get_all_projects/:token', cors(), function (req, res) {
  
    var token = req.params.token;

    var options = {
        'method': 'GET',
        'url': 'https://odk-server.icipe.org/v1/projects',
        'headers': {
          'Authorization': 'Bearer '+ token +'',
        }
      };
      request(options, function (error, response) {
        if (error) {

            res.send(JSON.parse(error));

        } else {

            res.send(JSON.parse(response.body));

        }
      });
    
});




//app.get('/', (req, res) => res.send('Hello World!'))

//const csv = require('csv-parser');
//const { Client, Query } = require('pg')

// Setup connection
//var username = "postgres" // sandbox username
//var password = "Arc10.6GIS" // read only privileges on our table
//var host = "localhost:5432"
//var database = "City_of_Chesapeake" // database name
//var conString = "postgres://"+username+":"+password+"@"+host+"/"+database; // Your Database Connection
//tooguest.eminingtti.ac.ke/payments_sheet.csv
// Set up your database query to display GeoJSON
//var nairobi_parcels = "SELECT row_to_json(fc) FROM (SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features FROM (SELECT 'Feature' As type, ST_AsGeoJSON(lg.geom)::json As geometry, row_to_json((map_parcel, address, legal, assessmnt_)) As properties FROM parcels As lg where assessmnt_='HILLCREST') As f) As fc";

//var client = new Client(conString);
//client.connect();

//cron.schedule("* * * * *", function() {
    //console.log("running a task every minute");

    

//});


//Get GeoJson as API
app.get('/data', cacheMiddleware(60), function (req, res) {
   
    var client = new Client(conString);
    client.connect();
    var query = client.query(new Query(nairobi_parcels));
    query.on("row", function (row, result) {
        result.addRow(row);
    });
    query.on("end", function (result) {
        
       // const myJSON = JSON.stringify(result.rows[0].row_to_json);
       // fs.writeFile('parcels_demo.json', myJSON, function(err){
        //    if(err){        
          //      console.log(err);
       // }

        //console.log(myJSON);
       // console.log("file written");

        //fs.readFile('file', 'utf8', function (err, data) {
           //     if (err) throw err;
           //     obj = JSON.parse(data);
     //   });

       // });
        res.send(result.rows[0].row_to_json);
        res.end();
        
    });
	


    
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))