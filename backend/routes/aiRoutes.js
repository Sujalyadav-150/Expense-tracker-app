const r=require("express").Router(),c=require("../controllers/aiController");r.post("/categorize",c.categorize);r.get("/insight",c.insight);module.exports=r;
