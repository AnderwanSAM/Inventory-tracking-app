//jshint esversion: 6 


// requesting modules
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
const { reject } = require("lodash");
const { name } = require("ejs");


// app setup 
const app = express();
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:true}));

// database setup/Connections ***********************************

// database connection 
mongoose.connect("mongodb+srv://user:pass@cluster0.ygxen.mongodb.net/?retryWrites=true&w=majority/trackingApp",{useNewUrlParser: true} ); 

// Collections creation
const inventoryItemSchema = new mongoose.Schema({
    name: String, 
    weight: String, 
});

const InventoryItem = mongoose.model("inventoryItem",inventoryItemSchema); 

const warehouseSchema = new mongoose.Schema({
    name: String, 
   warehouseInventory: [inventoryItemSchema]
});

const Warehouse = mongoose.model("Warehouse",warehouseSchema); 

// examples - default values to be added in the database if it is empty
const item1 = new InventoryItem({
    name: "Random Shoes", 
    weight: 4, 
}); 

const item2 = new InventoryItem({
    name: "Random Shoes 2", 
    weight: 4, 
}); 

const item3 = new InventoryItem({
    name: "hat", 
    weight: 1, 
}); 

const defaultItems = [item1,item2,item3]; 
const warehouse1= new Warehouse({
    name: "Ottawa",  
    warehouseInventory: defaultItems 

}); 

const warehouse2= new Warehouse({
    name: "Moncton", 
    warehouseInventory: defaultItems 
}); 

const warehouse3= new Warehouse({
    name: "Gatineau", 
    warehouseInventory: defaultItems 
}); 

const defaultWarehouses = [warehouse1,warehouse2,warehouse3]; 


// Routing , GET, POST handling  *****************************************************************

// Home 
// Here all the warehouses and all the items are displayed 
// Warehouses can be added on/from this page
// Items can be added/assigned from a warehouse page 
app.get("/home",function(req,res){


    Warehouse.find(function(err, warehouses){
        if (err){
            console.info(err);
        } else {
            // check if the inventory is empty in the database
            if (warehouses.length === 0 ){
                // if so, populate it with default values
                Warehouse.insertMany([warehouse1,warehouse2,warehouse3], function(err){
                if (err){
                    console.info(err);
                } }); 
                // populate the inventory items 
                let itemsList = [];
                defaultWarehouses.forEach(element => {
                    element.warehouseInventory.forEach(ItemElement => {
                        let temp = new InventoryItem({
                            name: ItemElement.name, 
                            weight: ItemElement.weight, 
                        }); 
                        itemsList.push(temp);
                    });
                });
                
                InventoryItem.insertMany(itemsList, function(err){
                    if (err){
                        console.info(err);
                    } }); 
                // and redirect 
                res.redirect("/home");
            } else {
                InventoryItem.find(function(err, inventoryItems){
                if (err){
                    console.info(err);
                } else {
                      // render the list 
            res.render('home',{newInventoryItems: inventoryItems ,newWarehouses:warehouses});   
                }
            })
          
            }
        }
    })

    

     

})


app.get("/",function(req,res){

    res.redirect("/home");
     
})

// dynamic routing for newly created warehouses 
app.get("/:customWarehouse", function(req,res){
    const customWarehouseName = req.params.customWarehouse;

    Warehouse.findOne({name: customWarehouseName}, function(err, foundWarehouse){
        if (!err){
          if (!foundWarehouse){
            //Create a new warehouse
            const warehouse = new Warehouse({
                name: customWarehouseName, 
                warehouseInventory: defaultItems
            })
            warehouse.save();
            res.redirect("/" + customWarehouseName);
          } else {
            //Show an existing warehouse 
            res.render("list", {StorageName: foundWarehouse.name, newInventoryItems: foundWarehouse.warehouseInventory});
          }
        }

})
});  

// redirect to warehouse page using id 
app.post("/warehouses", function(req,res){
    const warehouseId = req.body.warehouseId;

    Warehouse.findById(warehouseId, function(err, foundWarehouse){
        if (err){
            console.log(err); 
        } else {
            res.redirect(`/${foundWarehouse.name}`);
            
        }
    })

});  


// Add items into a warehouse 
app.post("/", function(req,res){
    let itemName = req.body.newItem ; 
    let itemWeight = req.body.newItemWeight;
    let warehouseName = req.body.list; 
    const itemElement = new InventoryItem({
        name: itemName, 
        weight: itemWeight, 
    });

    if (warehouseName === "null"){
        itemElement.save();
        res.redirect("/");
      } else {
          // Add in the warehouse list
        Warehouse.findOne({name: warehouseName}, function(err, foundWarehouse){
          if(err){
              console.log(err);
          } else {
            foundWarehouse.warehouseInventory.push(itemElement);
            foundWarehouse.save();
            // Add in the list of all items 
            itemElement.save(); 
            // redirect 
            res.redirect("/" + warehouseName);
          }
         
        });

    }
})

// Add a warehouse
app.post("/addWarehouse", function(req,res){
   
    const warehouseName = req.body.newWarehouseName.replace(/ /g,''); 

    // check if there is already a warehouse with this name
    Warehouse.findOne({name: warehouseName}, function(err, foundWarehouse){
        if (!err){
          if (!foundWarehouse){
            //Create a new warehouse
            const warehouse = new Warehouse({
                name: warehouseName, 
                warehouseInventory: defaultItems
            })
            warehouse.save();
            res.redirect("/home");
          } else {
            
          }
        } else {
            console.log(err); 
        }
})
    
    
})

// delete an item 
app.post("/delete", function(req,res){
    let  checkedItem = req.body.checkbox;
    const warehouseName = req.body.storageName; 

    if (warehouseName === "ottawa"){
        InventoryItem.findByIdAndRemove(checkedItem,function(err){
            if (err){
                console.log(err); 
            }
            res.redirect("/");
        } )
    } else {
    Warehouse.findOneAndUpdate({name: warehouseName}, {$pull: {warehouseInventory: {_id: checkedItem}}}, function(err, foundWarehouse){
        if (!err){
            InventoryItem.findByIdAndRemove(checkedItem,function(err){
                if (err){
                    console.log(err); 
                }
                res.redirect("/" + warehouseName);
            } )
            
        }
        });

    }
 
    
})

// delete a warehouse
app.post("/deleteWarehouse", function(req,res){
   
    const warehouseId = req.body.warehouseId; 
    Warehouse.findByIdAndRemove(warehouseId, function(err){
        if (err){
            console.log(err); 
        }
        res.redirect("/home");
    });
    
})

// Update 

app.post("/update", function(req,res){
   
    const warehouseName = req.body.storageName; 
   const itemName = req.body.elementId; 
    Warehouse.findOne({name:warehouseName},function(err, foundWarehouse){
        if(err){
            console.log(err);
        } else {
            const foundItem = foundWarehouse.warehouseInventory.find( element => element.name === itemName );
            res.render('itemUpdate',{itemName: foundItem.name , StorageName: warehouseName, item:foundItem});
        }
    } );
    
})

app.post("/updateItem", function(req,res){
    const warehouseName = req.body.storage; 
    const newItemName = req.body.newItemName; 
    const newItemWeight = req.body.newItemWeight; 
    const itemName = req.body.elementName; 
    
    // update item in the warehouse 
    Warehouse.findOne({name:warehouseName},function(err, foundWarehouse){
        if(err){
            console.log(err);
        } else {
            let foundItem = foundWarehouse.warehouseInventory.find(element => element.name === itemName); 
            let updateItem = {
                name:"", 
                weight:""
            }; 
            if (newItemName!=="") {updateItem.name =newItemName }; 
            if (newItemWeight!=="") {updateItem.weight =newItemWeight }; 
            // find the item and update it 
            Warehouse.updateOne({'warehouseInventory.name': foundItem.name},{'$set':{
                'warehouseInventory.$.name': updateItem.name,
                'warehouseInventory.$.weight': updateItem.weight, 
            }}, function(err){ 
                if (err){
                    console.log(err);
            }});
            res.redirect("/" + warehouseName);

            
        }
    } );
    

  
})

let port= process.env.PORT; 
if (port== null || port ==""){
    port = 3000;
}

app.listen(port,function(){
    console.log("Server running ");
})

// mongoose.connection.close();