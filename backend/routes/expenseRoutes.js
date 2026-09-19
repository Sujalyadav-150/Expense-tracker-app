const r=require("express").Router(),c=require("../controllers/expenseController");r.get("/",c.getExpenses);r.post("/",c.createExpense);r.delete("/:id",c.deleteExpense);module.exports=r;
