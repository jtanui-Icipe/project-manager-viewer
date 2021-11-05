var express = require('express');
let objectstocsv = require('objects-to-csv') 
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

var unzipper = require('unzipper');
var etl = require('etl');
const extract = require('extract-zip');
const {spawn} = require('child_process');
var R = require("r-script");
var pgtools = require("pgtools");

var massive = require("massive");
const CSVToJSON = require('csvtojson');


const dataForge = require('data-forge');
    require('data-forge-fs');



const port = process.env.PORT || 3000;
app.use(compression())
app.use(cors())

var url = "mongodb://localhost:27017/";

let MongoClient = require('mongodb').MongoClient;

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

 function executeExAsync(callback) {
	const attitude = [
		{ group: '(40,55]', rating: 46.7143, advance: 41.1429 },
		{ group: '(55,70]', rating: 64.6154, advance: 41.9231 },
		{ group: '(70,85]', rating: 77.2, advance: 45.5 }
	];

  R("example/ex-async.R")
  .data({df: attitude, nGroups: 3, fxn: "mean" })
  .call(function(err, d) {
    if (err) throw err;
    console.log(d);
  });
}

async function get_all_projects(){

  var url = "mongodb://localhost:27017/";
  MongoClient.connect(url, function(err, db) {
 
   var dbo = db.db("project_metadata");

   dbo.collection("info_list").drop(function (err, result) {
     if (err === 26){
        return false;
     }
     if (result) console.log("Collection successfully deleted.");
    
    });

}); 


var options = {
'method': 'GET',
'url': 'https://odk-server.icipe.org/v1/projects',
'headers': {
 'Content-Type': 'application/json',
 'Authorization': 'Basic anRhbnVpQGljaXBlLm9yZzpBcmMxMC42R0lT',
 'Cookie': '__Host-session=C8MC34BIrAon3ywVbTt90kXdv8U8rIw5mDXVZTiewqhK7ZeVjj7tLhRue6bkO05l; __csrf=XJkxAKn7!1nKI6ZdKrkDyx9UUsh5DcvUXZrmWF8hgLJoIsMZeqq3yf1xzmjg5A7D'
}
};

await request(options, function (error, response) {
    if (error) throw new Error(error);
    var projects = JSON.parse(response.body);
    
    var pp = [];

    for (i = 0; i < projects.length; i++) {

         get_forms(projects[i],projects)
    } 
}); 

}

async function get_forms(projects, project_array){

      var options = {
      'method': 'GET',
      'url': 'https://odk-server.icipe.org/v1/projects/'+ projects.id +'/forms',
      'headers': {
        'Content-Type': 'application/json',
        'Authorization': 'Basic anRhbnVpQGljaXBlLm9yZzpBcmMxMC42R0lT',
        'Cookie': '__Host-session=C8MC34BIrAon3ywVbTt90kXdv8U8rIw5mDXVZTiewqhK7ZeVjj7tLhRue6bkO05l; __csrf=XJkxAKn7!1nKI6ZdKrkDyx9UUsh5DcvUXZrmWF8hgLJoIsMZeqq3yf1xzmjg5A7D'
      }
      };

      await request(options, function (error, response) {
      if (error) throw new Error(error);
        var forms = JSON.parse(response.body);
        
        var formID = [];

        for (i = 0; i < forms.length; i++) {

              //get_forms(forms[i])
              download_zip(forms[i].xmlFormId,forms[i].projectId);

            // var ff = forms[i];
            

            //console.log(sd);
            formID.push(forms);
            //console.log("FormID",JSON.stringify(ff));
            //console.log("Formss",forms);

            /* var arr1 = new Array(ff);
            var arr2 = new Array(projects);

            var arr3 = arr1.concat(arr2);
            console.log(arr3[0]);
            formID.push(arr3); */

        } 

        //const combined1 = concat(formID, project_array);

        //console.log("FormID", combined1);
        //var form = formID;
        /*var project_data = form.reduce(function(result, current) {
          return Object.assign(result, current);
        },{})*/

      }); 


}

async function download_zip(formID,projectID){

    var options = {
    'method': 'GET',
    'url': 'https://odk-server.icipe.org/v1/projects/'+projectID+'/forms/'+formID+'/submissions.csv.zip?attachments=false',
    'headers': {
    'Content-Type': 'application/json',
    'Authorization': 'Basic anRhbnVpQGljaXBlLm9yZzpBcmMxMC42R0lT',
    'Cookie': '__Host-session=ZG69gx3Lmz3GBxWGcB8PIn5ITBP7!3PYolCTc9FCOj0%24zso2hXmtTQeMS43AAtPN; __csrf=mlNH1CsBb31Qw1GFBCV3v124p0mXKZVu8K!dwkpSRdjHRlBiiJTGs1blAssVghCp'
    }
    };
    await request(options, function (error, response) {
    if (error) throw new Error(error);
    //console.log(response.body);
    }).pipe(fs.createWriteStream('./extracts/'+formID+'.zip'))
    .on('close', function () {

      read_stream()

      async function read_stream(){

      await fs.createReadStream('./extracts/'+formID+'.zip').pipe(unzipper.Extract({ path: './final/'+formID+'/' })).on('close', function () {
          
          //setTimeout(function(){
            //count_validate_forms(formID,formID)
          // }, 5000);
          var url = "mongodb://localhost:27017/";
          MongoClient.connect(url, function(err, db) {
          if (err) throw err;
          var dbo = db.db("project_metadata");

          var db_orinal_name = formID.replace('.','_');
          var db_customized_name =  db_orinal_name.replace(/\s+/g,"_");

          var myobj = { project_id:projectID, form_id:formID ,folder_name: formID, database_name: db_customized_name,status:'',description:''};
            dbo.collection("info_list").insertOne(myobj, function(err, res) {
              if (err) throw err;
              console.log("1 document inserted");
            //  / db.close();
            });
        }); 

      });

    }
//call_matlab(formID)

});

}

async function insert_to_db(){
  var url = "mongodb://localhost:27017/";
 await MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db("project_metadata");
    dbo.collection("info_list").find({}).toArray(function(err, result) {
      
      for(var i = 0; i < result.length; i++) {
          var folders = result[i].folder_name;
          var form = result[i].folder_name;
          var database = result[i].database_name;
          var project_id = result[i].project_id;
          var form_id = result[i].form_id;
          
          count_validate_forms(project_id,form_id,folders,form,database)

       }
     

    });
  }); 

}


async function count_validate_forms(project_id,form_id,fd,fm,db){


  let folder_directory = fd;
  let form = fm;
  let database = db;
   

  let main_directory = './final/'+ folder_directory +'';

 await fs.readdir(main_directory, (err, files) => {

   var db_orinal_name = database.replace('-','_');
   var db_customized_name =  db_orinal_name.replace(/\s+/g,"_");

   let db_name = "mongodb://localhost:27017/"+ db_customized_name +"";
 
   //Na hapa
   
   if(files.length > 1){

     let jui = [];
     let jui_main = [];
     let dbbb;

     for (var i=0; i<files.length; i++) 
     {
         let file = files[i];
         let filename =  ''+form+'.csv';

         let main_file = '';
           
        /* MongoClient.connect(db_name, function(err, db) {
           if (err) 
           {
              console.log("Error", err);
           } 
           else 
           {
             dbbb = db;              
           }
           
           //db.close();
         });*/

          

          if(file == filename){

           var table_name_main = file.split('.csv').join('');

           const df = dataForge.readFileSync('./final/'+folder_directory+'/'+file+'')
           .parseCSV();

           const columnNames = df.getColumnNames();
           //var table_name_others = columnNames.split(''+form+'-').join(' ');

           const ColumnRows = df.toArray();

           const col = []

           columnNames.forEach(function callback(value, index) {

               //ColumnRows.forEach(valueRow => {

                 let stripped_column = value.split("-").pop();
                 if(stripped_column == 'Longitude' || stripped_column == 'Latitude')
                 {

                  stripped_column = 'gps-'+stripped_column+'';

                 }
                 

                 let stripped_column2 = stripped_column.split("-").pop();

                 col.push(stripped_column);
                // const rows = df.toRows();
                 // console.log(rows[0]);
               //})

           }); 

           const rows = df.toRows();
           const pairss = df.toPairs();

           const ddd = [];

           rows.forEach(function callback(value, index) {
            // console.log("Collll", ''+value+':',''+value[parseInt(index)]+'');

            //if(value[parseInt(index)] != ''){

               ddd.push(value);
               

             //console.log( value );

            //}
            
            // console.log("Rows",value);

           })

           
           
           //console.log("Array Array",JSON.stringify(ddd));
           
           const pairs = df.toPairs(); 

           main_file = new dataForge.DataFrame({
               columnNames: col,
               rows: ddd
            });

           const main_table = main_file.toArray();

          //. console.log(""+ db_name +":", main_table.length );

           var change_table_name = file.replace(''+ form +'-', '');
           let table_name = change_table_name.replace('.csv', '');

          
           if(main_table.length != 0){

           MongoClient.connect(db_name, function(err, db) {
             if (err) throw err;
             var dbo = db.db(db_customized_name);

             dbo.collection(table_name).drop(function (err, result) {
              if (err === 26){
                  return false;
              }
              if (result) console.log("Collection successfully deleted.");
              
              dbo.createCollection(table_name, function(errr, res) {
                if(errr == 48){
                  return false;
                  } else {

                  
                      dbo.collection(table_name).insertMany(main_table);
                      //dbo.collection(table_name).getCollection(table_name).update({}, {$unset: {fieldname: "KEY"}});
                      //for_download(folder_directory,file,to_join_data)
                      //setTimeout(function(){ return true; },90000);

                  }
              });

              });
             
           });

           //console.log("Data with images",main_table);
          
           store_images(project_id, form_id,main_table)


          }
           //console.log(objects);
           //fs.writeFileSync('student-2.json', JSON.stringify(objects));

          //console.log(df2);
          //fs.writeFileSync('student-2.json', df2)
           //console.log("Column", columnNames[i]);
          // var table_name_others = columnNames.split(columnNames[i]).join('');
          // console.log(pairs);
          


          /* CSVToJSON().fromFile('./'+folder_directory+'/'+file+'')
           .then(data => {
               var json_doors = JSON.parse(JSON.stringify(data))
               // users is a JSON array
               // log the JSON array
               //console.log(users);
              
               // var json_doors = JSON.parse(JSON.stringify(data));
               //console.log("Keeyyy",json_doors[0][1]);
               var dd = JSON.stringify(data);

               var keys = Object.keys(json_doors);
               //console.log(keys[0]);
               
               //fs.writeFileSync('student-2.json', JSON.stringify(data));


           }).catch(err => {
               // log error if any
               console.log(err);
           });*/
           

          } else {
             
           var change_table_name = file.replace(''+ form +'-', '');
           let table_name = change_table_name.replace('.csv', '');
           

              /* dbo = dbbb.db(folder_directory);
               dbo.createCollection(file, function(errr, res) {
               if (errr)
               {
                 
                 if(errr == 48){
                     console.log("Collection Exists", errr.codeName);
                     
                 }

                 }else {

                  console.log("Collection created!");

                 }
               
             // db.close();
              });*/

              

           const df_other = dataForge.readFileSync('./final/'+folder_directory+'/'+file+'').parseCSV();

           const columnNames = df_other.getColumnNames();
           //var table_name_others = columnNames.split(''+form+'-').join(' ');

       
           const col_others = []

           columnNames.forEach(function callback(value, index) {

               //ColumnRows.forEach(valueRow => {
               
                const stripped_column = value.split("-").pop();
                let stripped_column2 = stripped_column.split("-").pop();
                
                 col_others.push(stripped_column);
                // const rows = df.toRows();
                 // console.log(rows[0]);
 

               //})

           }); 

           
           const objects = df_other.toArray();

           const rows = df_other.toRows();

           let fr = [];

           let to_join_data = [];

           objects.forEach(function callback(value, index) {

             var old_key = value['KEY'];
             var p_key = value['PARENT_KEY'];
             delete p_key

             const new_key = old_key.split('/');

             var values = {};
             values = value;
             
             values["PARENT_KEY"] = new_key[0];
             delete old_key
             to_join_data.push(values);

           });
          

          // console.log("My New Array",to_join_data);

           //console.log(fr);
           //console.log(objects);
           
           const final_data = new dataForge.DataFrame(to_join_data);

           if(to_join_data.length != 0){

              /// console.log("To Join"+ folder_directory +"", to_join_data.length);

              MongoClient.connect(db_name, function(err, db) {
              if (err) throw err;
              var dbo = db.db(db_customized_name);

                dbo.collection(table_name).drop(function (err, result) {
                if (err === 26){
                    return false;
                }
                if (result) console.log("Collection successfully deleted.");
                
                dbo.createCollection(table_name, function(errr, res) {
                  if(errr == 48){
                    return false;
                    } else {
  
                        dbo.collection(table_name).insertMany(to_join_data);
                        //dbo.collection(table_name).getCollection(table_name).update({}, {$unset: {fieldname: "KEY"}});
                       //for_download(folder_directory,file,to_join_data)
                        //setTimeout(function(){ return true; },90000);
  
                    }
                });

                });

            });

           // store_images(to_join_data)
           // console.log(objects);

          }

         // fs.writeFileSync('student-2.json', JSON.stringify(to_join_data));

           

            //const final_data_other_modules = df_merged.toArray(); 

            //console.log("MMMMM", JSON.stringify(mmmmmm));
            //fs.writeFileSync(''+ i +'student-2.json', JSON.stringify(mmmmmm));

           // jui.push(final_data);
           // jui_main.push(main_file);

         }
      }

       //console.log("Joint joint", jui_main);
     //fs.writeFileSync('student-2.json', JSON.stringify(jui));
     
   } else {

     for (var i=0; i<files.length; i++) 
     {
         let file = files[i];
         let filename =  ''+form+'.csv';

         let main_file = '';

         var change_table_name = file.replace(''+ form +'-', '');

           let table_name = change_table_name.replace('.csv', '');
           

              /* dbo = dbbb.db(folder_directory);
               dbo.createCollection(file, function(errr, res) {
               if (errr)
               {
                 
                 if(errr == 48){
                     console.log("Collection Exists", errr.codeName);
                     
                 }

                 }else {

                  console.log("Collection created!");

                 }
               
             // db.close();
              });*/

              

           const df_other = dataForge.readFileSync('./final/'+folder_directory+'/'+file+'').parseCSV();

           const columnNames = df_other.getColumnNames();
           //var table_name_others = columnNames.split(''+form+'-').join(' ');

       
           const col_others = []

           columnNames.forEach(function callback(value, index) {

               //ColumnRows.forEach(valueRow => {
               
                 const stripped_column = value.split("-").pop();
                 let stripped_column2 = stripped_column.split("-").pop();
                 
                 col_others.push(stripped_column2);
                // const rows = df.toRows();
                 // console.log(rows[0]);
 
               //})

           }); 

     
           const objects = df_other.toArray();

           const rows = df_other.toRows();

           let fr = [];

           let to_join_data = [];

           objects.forEach(function callback(value, index) {

             var old_key = value['KEY'];
             var p_key = value['PARENT_KEY'];
             delete p_key

             const new_key = old_key.split('/');

             var values = {};
             values = value;

             values["PARENT_KEY"] = new_key[0];
             delete old_key

            
             to_join_data.push(values);

           });
          

          // console.log("My New Array",to_join_data);

           //console.log(fr);
           //console.log(objects);


           if(to_join_data.length != 0){

             /// console.log("To Join"+ folder_directory +"", to_join_data.length);

            MongoClient.connect(db_name, function(err, db) {
             if (err) throw err;
             var dbo = db.db(db_customized_name);

             
              dbo.collection(table_name).drop(function (err, result) {

                if (err === 26){
                  return false;
                }

                if (result) console.log("Collection successfully deleted.");
                  dbo.createCollection(table_name, function(errr, res) {
                      if(errr == 48){
                        return false;
                        } else {
      
                            dbo.collection(table_name).insertMany(to_join_data);
                            //for_download(folder_directory,file,to_join_data)
                            setTimeout(function(){ return true; }, 90000);
      
                      }
                });
              });

           });

           store_images(project_id, form_id,to_join_data)

          }
          
      }
   }
   //mwisho
 });
}

async function store_images(project_id, form_id,data_array){

 //fs.writeFileSync('student-2.json', JSON.stringify(data_array));

  await data_array.forEach(function callback(value, index) {   

      if(value.AttachmentsPresent != '0'){

            console.log(project_id,form_id,value.AttachmentsPresent);
          

      }

    });
       

}

async function for_download(folder_directory,file,to_join_data){
     console.log("Folder",folder_directory, "File",file, "Data", to_join_data);
   /*list_databases()

   async function list_databases(){



    var url = "mongodb://localhost:27017/";
     // Connect using MongoClient
      MongoClient.connect(url, function(err, db) {
        // Use the admin database for the operation
        var adminDb = db.admin();
        // List all the available databases
        adminDb.listDatabases(function(err, result) {
          console.log(result.databases);
          db.close();
        });
      });
         

   }*/

  const objectstocsv = require('objects-to-csv');

 //const csv = new objectstocsv(JSON.parse(to_join_data));
 // fs.writeFileSync('/download/'+ folder_directory +'/file', JSON.stringify(to_join_data));
 //await csv.toDisk('/download/'+folder_directory+'/'+file+'.csv');

}


cron.schedule('*/20 * * * *', () => {
  get_all_projects();
  console.log("Run after 2 minutes");
});

cron.schedule('*/40 * * * *', () => {
  insert_to_db();
  console.log("Run after 4 minutes");
});

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname + '/index.html'));
});

app.get('/home', function(req, res) {
  res.sendFile(path.join(__dirname + '/home.html'));
 // insert_to_db();
  //for_download();
});

app.get('/test_data', function(req, res) {
  //res.sendFile(path.join(__dirname + '/home.html'));
  insert_to_db();
  //for_download();
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

app.get('/authenticated_images/:project/:project_form/:token', function (req, res) {

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

app.get('/pay_via_mpesa', function (req, res) {
  
  var request = require('request');
  var options = {
    'method': 'POST',
    'url': 'http://41.215.63.138:12397/SafariCareMadisonMpesastk/Transactions.asmx?wsdl',
    'headers': {
      'Content-Type': 'text/xml'
    },
    body: '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"\r\n\r\n              xmlns:tem="http://tempuri.org/">\r\n\r\n              <soapenv:Header/>\r\n\r\n              <soapenv:Body>\r\n\r\n              <tem:STKPush_SafariCareMadisonGeneral>\r\n\r\n              <tem:strAmount>2</tem:strAmount>\r\n\r\n              <tem:ShortCode>880928</tem:ShortCode>\r\n\r\n              <tem:strMSISDN>254728563683</tem:strMSISDN>\r\n\r\n              <tem:TransactionDesc>Motor_Comprehensive</tem:TransactionDesc>\r\n\r\n              <tem:AccountRef>SRS.90022</tem:AccountRef>\r\n\r\n              <tem:APIKey>SCR-MD_ih7ytFBV27-XKJ245DS97TRxSr1</tem:APIKey>\r\n\r\n              <tem:ClientID>SCareMadG</tem:ClientID>\r\n\r\n              </tem:STKPush_SafariCareMadisonGeneral>\r\n\r\n              </soapenv:Body>\r\n\r\n              </soapenv:Envelope>'

  };
  request(options, function (error, response) {
    if (error) throw new Error(error);
    console.log(response.body);
  });

}); 

app.get('/get_collection_data/:form/:collection', function (req, res) {
  
  var collection = req.params.collection;
  var form = req.params.form;
  let db_name = "mongodb://localhost:27017/"+ form +"";

  MongoClient.connect(db_name, function(err, db) {
    if (err) throw err;
    var dbo = db.db(form);

     dbo.collection(collection).find({}).limit(100).toArray(function(err, result) {
      if (err) throw err;
        res.send(JSON.parse(JSON.stringify(result)));
      //db.close();
    });

   });
});


app.get('/get_data_collectors_count/:form/:collection', function (req, res) {
  
  var collection = req.params.collection;
  var form = req.params.form;
  let db_name = "mongodb://localhost:27017/"+ form +"";

  MongoClient.connect(db_name, function(err, db) {
    if (err) throw err;
    var dbo = db.db(form);

     dbo.collection(collection).aggregate([
      {
         $group: {
            _id: "$SubmitterName",
            NumberOfSubmitters: {
               $count: {}
            }
         }
      }
     ]).toArray(function(err, result) {
      if (err) throw err;
       //console.log("Hello",result);
        res.send(result);
      //db.close();
    });

   });
});




app.get('/get_collection_data_count/:form/:collection', function (req, res) {
  
    var collection = req.params.collection;
    var form = req.params.form;
    let db_name = "mongodb://localhost:27017/"+ form +"";

   MongoClient.connect(db_name, function(err, db) {
   
    //const database = db.db(form);
    //const count = database.collection(collection);
    //const estimate =  count.estimatedDocumentCount();
    //const estimate = database.orders.countDocuments({})
     // Estimate the total number of documents in the collection
     // and print out the count.
   // const estimate =  count.estimatedDocumentCount();
      var dbo = db.db(form);
      
      dbo.collection(collection).stats(function(err, result) {
        if (err) throw err;
          res.send(JSON.parse(JSON.stringify(result)));
        //db.close();
      });

   

   });

  /*MongoClient.connect(db_name, function(err, db) {
    if (err) throw err;
    var dbo = db.db(form);

     dbo.collection(collection).find({}).limit(100).toArray(function(err, result) {
      if (err) throw err;
        res.send(JSON.parse(JSON.stringify(result)));
      //db.close();
    });

   });*/


});

app.get('/get_all_data_for_map/:database/:collection', function (req, res) {
  
  var database = req.params.database;
  var collection = req.params.collection;

  let db_name = "mongodb://localhost:27017/"+ database +"";

  MongoClient.connect(db_name, function(err, db) {
    if (err) throw err;
    var dbo = db.db(database);

     dbo.collection(collection).find({}).toArray(function(err, result) {
      if (err) throw err;
        res.send(JSON.parse(JSON.stringify(result)));
      //db.close();
     });
   });
});

app.get('/get_all_forms_db_collections/:form', cacheMiddleware(60), function (req, res) {
  
  var form = req.params.form;
  let db_name = "mongodb://localhost:27017/"+ form +"";

  MongoClient.connect(db_name, function(err, db) {
    if (err) throw err;
    var dbo = db.db(form);

    dbo.listCollections().toArray(function(err, collections) {

        res.send(JSON.parse(JSON.stringify(collections)));
          //and u can loop over items to fetch the names
          //console.log("Collections",collections);
     });
   });
});

app.get('/download_data/:folder/:filename/:csv', function (req, res) {
  
  
  var main_name = req.params.folder;
  var file_name_path = req.params.filename;
  var filetype = req.params.csv;

  let db_name = "mongodb://localhost:27017/"+ main_name +"";

  MongoClient.connect(db_name, function(err, db) {
    if (err) throw err;
    var dbo = db.db(main_name);

     dbo.collection(file_name_path).find({}).toArray(function(err, result) {
      if (err) throw err;
       // res.send(JSON.parse(JSON.stringify(result)));
      //db.close();
      //res.setHeader('Content-Disposition','attachment:filename="'+file_name_path+'.csv"')
      if(filetype == 'csv'){
        save_as_csv(result)
      }

      if(filetype == 'json'){
        save_as_json(result)
      }

      if(filetype == 'stata'){
        save_as_stata(result)
      }
      
        //console.log(result);

     });
   });

   async function save_as_stata(result){

    const csv = new objectstocsv(result);
    var filess = ''+file_name_path+'.csv';
  
     await csv.toDisk('./exports/'+ filess +'');
      const file = `${__dirname}/exports/`+filess+``;
      
      convert_stata(file, file_name_path)

    // res.set('Content-Type', 'application/octet-stream');
     //res.download(file,() => {

      //fs.unlinkSync(file)

    //})

  };

  async function convert_stata(file_path,file_names){

        var file_name = file_names.replace('.','_');

        var spawn = require("child_process").spawn

        var dataToSend;
        // spawn new child process to call the python script
        const python = spawn('python', ['./stata.py',''+file_path+'',''+file_name+'']);
        // collect data from script
       await python.stdout.on('data', function (data) {
          console.log('Pipe data from python script ...');
          dataToSend = data.toString();
        });
        // in close event we are sure that stream from child process is closed
        python.on('close', (code) => {
        console.log(`child process close all stdio with code ${code}`);
        // send data to browser
        //res.send(dataToSend)
        

          res.set('Content-Type', 'application/octet-stream');
          res.download('./exports/'+file_name+'.dta',() => {

           fs.unlinkSync('./exports/'+file_name+'.dta')
           fs.unlinkSync('./exports/'+file_name+'.csv')

         })

        });
  

  }

   async function save_as_csv(result){

      
      const csv = new objectstocsv(result);
      var filess = ''+file_name_path+'.csv';
    
       await csv.toDisk('./exports/'+ filess +'');
        const file = `${__dirname}/exports/`+filess+``;
    
       res.set('Content-Type', 'application/octet-stream');
       res.download(file,() => {

        fs.unlinkSync(file)

      })
    };

    async function save_as_json(result){


       await fs.writeFileSync('./exports/'+file_name_path+'.json', JSON.stringify(result));


        const file = `${__dirname}/exports/`+file_name_path+`.json`;
    
       res.set('Content-Type', 'application/octet-stream');
       res.download(file,() => {

        fs.unlinkSync(file)

      })
    };

  
   
  /*var full_path_name = ""+main_name+"-"+file_name_path+"";
  console.log(full_path_name);

  var file = __dirname + '/final/'+main_name+'/'+full_path_name+'.csv';

  
  res.download(""+file+"",() => {

    fs.unlinkSync(""+file+"")

  })

  /*if(csv == 'csv')
  {
      var file_name_path = ''+main_name+'-'+collection+'.csv';
      
      var file = __dirname + '/final/'+main_name+'/'+file_name_path+'';

        var filename = path.basename(file);
        var mimetype = mime.lookup(file);

        res.setHeader('Content-disposition', 'attachment; filename=' + filename);
        res.setHeader('Content-type', mimetype);

        var filestream = fs.createReadStream(file);
        //filestream.pipe(res);
        res.download(file);

    }*/
  
  
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
         var for_image = [];

         var json_obj = JSON.parse(response.body);
         console.log(json_obj);
         console.log(json_obj);
         json_obj2 = json_obj.value.length;

         if(json_obj2 != 0){

         for(var i = 0; i < json_obj2; i++) {
          var obj = json_obj.value[i];
          
         // console.log(obj.hasOwnProperty('gps'));

          delete obj.survey_description;
          delete obj.__system
          delete obj.meta

           objj.push(obj);
           for_image.push(obj.KEY);
          

         }
         }

         res.send(objj);

         get_uuid(for_image)
        

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

app.get('/convert', cacheMiddleware(60), function (req, res) {

  var spawn = require("child_process").spawn

  var dataToSend;
  // spawn new child process to call the python script
  const python = spawn('python', ['./stata.py']);
  // collect data from script
  python.stdout.on('data', function (data) {
   console.log('Pipe data from python script ...');
   dataToSend = data.toString();
  });
  // in close event we are sure that stream from child process is closed
  python.on('close', (code) => {
  console.log(`child process close all stdio with code ${code}`);
  // send data to browser
  res.send(dataToSend)
  });
  

});
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