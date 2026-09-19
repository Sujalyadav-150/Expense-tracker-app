const OpenAI=require("openai");
const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
const categories=["Food","Travel","Shopping","Bills","Entertainment","Health","Education","Salary","Other"];

async function categorizeExpense(description){
 if(!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
 const r=await client.responses.create({model:"gpt-5.6-luna",input:[
  {role:"system",content:`Return ONLY one category from: ${categories.join(", ")}.`},
  {role:"user",content:description}
 ]});
 const answer=r.output_text.trim();
 return categories.includes(answer)?answer:"Other";
}
async function spendingInsight(expenses){
 if(!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
 const data=expenses.map(e=>({amount:e.amount,description:e.description,category:e.category}));
 const r=await client.responses.create({model:"gpt-5.6-luna",input:`Give one practical spending insight in under 30 words. Data: ${JSON.stringify(data)}`});
 return r.output_text.trim();
}
module.exports={categorizeExpense,spendingInsight};
