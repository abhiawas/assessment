const express = require('express');
const app = express();
const request   =  require("request");
const rp = require('request-promise');
const csv = require('csvtojson')
const { Parser } = require('json2csv');
const fs = require('fs');
const fileUpload = require('express-fileupload');
const url = 'https://13c212b6353a776a5a43d0ace5b0b7a6:c7c95ff577dcd5f209ca29925cd23048@api.shoplightspeed.com/en/products.json?fields=id,fulltitle,description,content,createdAt&limit=150';
const client_id = 'c028b73b20e896d9dc48fb3649a6536758872df0bac9971d0ee04e4b68e93064';
const client_secret = '9840b38008b1f9d6da432782457b3bb0114569dee6e91c98b9142afcb47bd90b';
const refresh_token = 'cb8520fc6fa0f83e706ef3818e825ff16da0c899';
const port = process.env.PORT || 3000;

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(fileUpload());


app.get('/',(req,res)=>{
    res.render("home")
})

app.get('/products',(req,res)=>{
    res.render("products")
})

app.get('/items',(request,res) => {
    res.render("items")
})


app.post('/items',(req,res)=>{
    getToken(res)
})


app.post('/products', (req,response)=>{         
    var options = {
        uri: url,
        json: true // Automatically parses the JSON string in the response
    };
    rp(options)
        .then(function(repos) {
            let productArray = [] 
            for (i = 0; i < repos.products.length; i++){
                productObject = {
                    "ProductId":repos.products[i].id,
                    "CreatedTime": repos.products[i].createdAt,
                    "FullTitle":repos.products[i].fulltitle,
                    "Description" : repos.products[i].description,
                    "Content": repos.products[i].content
                }
                productArray.push(productObject)
            }
    createCSV(productArray,response);
    }).catch(function (err) {
});           
})


app.post('/upload', (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }
  let sampleFile = req.files.sampleFile;
  sampleFile.mv(sampleFile.name, function(err) {
    if (err)
      return res.status(500).send(err);
    const FilePath = sampleFile.name
    if(sampleFile.mimetype == "application/json"){
        fs.readFile(FilePath, function(err, data) {  
            if (err) throw err; 
            const jsonObj = JSON.parse(data); 
            postData(jsonObj,res); 
        });  
    }else{
        csv()
        .fromFile(FilePath)
        .then((jsonObj)=>{
           postData(jsonObj,res); 
        })
    }
    })
  })

function createCSV(Array,resp) {
    const fields = ['ProductId','CreatedTime','FullTitle','Description','Content'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(Array);
    fs.writeFile('ProductDetails.csv', csv, function (err) {
    if (err) throw err;
    var file = "ProductDetails.csv";
    resp.download(file,'ProductDetails.csv');
    }
)}

function postData(jsonObj,res){
for (i = 0; i < jsonObj.length; i++) {
    var options = {
        method: 'POST',
        uri: url,
        body: {
            "product": { 
                "title":jsonObj[i].title,
                "fulltitle":  jsonObj[i].fulltitle,
                "description": jsonObj[i].description,
                "content": jsonObj[i].content
            }
            },
        json: true 
    };
    rp(options)
        .then(function(parsedBody) {
        })
        .catch(function (err) {
            console.log(err)    
        });
    }
    res.redirect((302, '/products'))
};



function getToken(res){  
    var options = {
        method: 'POST',
        uri: 'https://cloud.lightspeedapp.com/oauth/access_token.php',
        json: true,
        form: {
            client_id: client_id,
            client_secret: client_secret,
            scope:'employee:all' ,
            grant_type:'refresh_token' ,
            refresh_token: refresh_token
        },
        headers: {
             'content-type': 'application/x-www-form-urlencoded' 
        }
    };
     
    rp(options)
        .then(function (body) {
            getCount(body).then(count => {
                getData(body,count).then(objectArray=>{
                    createItemCSV(objectArray, res)
                })
            })
           
        })
        .catch(function (err) {
        });
}

function getCount(token) {

    return new Promise(function(resolve, reject) {
        let count = 0

        var options = {
            uri: 'https://api.lightspeedapp.com/API/Account/229803/Item.json',
            json: true,
            headers:{
                "Authorization" : "Bearer "+token.access_token+""
            }
        };
    
        rp(options)
            .then(function (body) {
                count = body['@attributes'].count
                resolve(count)
            })
            .catch(function (err) {
                reject()
            });
        
      }); 

}


function getData(token, count){
    return new Promise( async (resolve, reject) =>{
        let responses = []
        let objectArray = []
        let countItem = 0

        for( i=0; i<count; i=i+100){
            var options = {
                uri: 'https://api.lightspeedapp.com/API/Account/229803/Item.json?orderby=createTime&orderby_desc=1&load_relations=["Note"]&offset='+i,
                json: true,
                headers:{
                    "Authorization" : "Bearer "+token.access_token+""
                }
            };

            const response = await rp(options)
                .then(function (body) {

                    responses.push(body);

                    for(c=0; c<body.Item.length; c++){

                        if(parseInt(body.Item[c].Prices.ItemPrice[0].amount) > 65 && countItem < 300){
                            itemObject = {
                                "ItemIdentifier" : body.Item[c].itemID,
                                "ItemCreateTime": body.Item[c].createTime,
                                "DefaultCost" : body.Item[c].defaultCost,
                                "AverageCost" : body.Item[c].avgCost,
                                "CategoryID" : body.Item[c].categoryID,
                                "itemMatrixID" : body.Item[c].itemMatrixID,
                                "Note" : body.Item[c].Note.note
                            }
    
                            itemObject.CategoryID = itemObject.CategoryID > 0 ? "True" : "False"
                            itemObject.itemMatrixID = itemObject.itemMatrixID > 0 ? "True" : "False"
    
                            countItem++
                            objectArray.push(itemObject)
                        }
                        else if(countItem>=300)
                            break;
                    }
                })
                .catch(function (err) {
                });

                if(countItem >= 300)
                    break;
            }

            resolve(objectArray)
        })
}


function createItemCSV(objectArray, resp) {
    const fields = ['ItemIdentifier','ItemCreateTime','DefaultCost','AverageCost','CategoryID', 'itemMatrixID', 'Note'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(objectArray);
    fs.writeFile('ItemsDetails.csv', csv, function (err) {
        if (err) throw err;
        var file = "ItemsDetails.csv";
        resp.download(file,'ItemsDetails.csv');
    })
}

app.listen(port,()=>{
	console.log('server has started on:'+ port);
})