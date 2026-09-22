const OpenAI=require("openai");
let client;
const categories=["Food","Travel","Shopping","Bills","Entertainment","Health","Education","Salary","Other"];
const model=process.env.OPENROUTER_MODEL||"openai/gpt-4o-mini";
const apiKey=process.env.OPENROUTER_API_KEY;

function getClient(){
 if(!client)client=new OpenAI({
  apiKey,
  baseURL:process.env.OPENAI_BASE_URL||"https://openrouter.ai/api/v1",
  timeout:5000
 });
 return client;
}

function localCategory(description){
 const text=` ${description.toLowerCase().replace(/[^a-z0-9]+/g," ").trim()} `;
 const signals={
  Food:["food","restaurant","lunch","dinner","breakfast","grocery","groceries","coffee","meal","pizza","burger","snack","swiggy","zomato","dominos"],
  Travel:["taxi","uber","ola","flight","airline","hotel","travel","train","railway","bus","metro","fuel","petrol","diesel","toll","parking"],
  Shopping:["shopping","shop","clothes","clothing","shirt","dress","shoes","fashion","amazon","flipkart","myntra","mall","store","purchase","bought","online"],
  Bills:["rent","electric","electricity","water","internet","wifi","phone","mobile","bill","insurance","recharge"],
  Entertainment:["movie","cinema","concert","game","gaming","netflix","spotify","music","entertainment","disney"],
  Health:["doctor","medicine","pharmacy","health","hospital","clinic","dentist","gym","medical","tablet"],
  Education:["school","course","book","tuition","education","college","university","class","exam"],
  Salary:["salary","paycheck","income","bonus","wages","freelance"]
 };
 let bestCategory="Other",bestScore=0;
 for(const category of Object.keys(signals)){
  const score=signals[category].reduce((total,word)=>total+(text.includes(` ${word} `)?1:0),0);
  if(score>bestScore){bestCategory=category;bestScore=score;}
 }
 return bestCategory;
}

async function categorizeExpense(description){
 if(!apiKey)return localCategory(description);
 try{
  const r=await getClient().responses.create({model,input:[
   {role:"system",content:`Return ONLY one category from: ${categories.join(", ")}.`},
   {role:"user",content:description}
  ]});
    const answer=r.output_text.trim().replace(/[^a-z]/gi,"").toLowerCase();
    const category=categories.find(item=>item.toLowerCase()===answer);
    return category||localCategory(description);
 }catch(e){return localCategory(description);}
}
async function spendingInsight(expenses){
 if(!apiKey)return localInsight(expenses);
 const data=expenses.map(e=>({amount:e.amount,description:e.description,category:e.category}));
 try{
  const r=await getClient().responses.create({model,input:`Give one practical spending insight in under 30 words. Data: ${JSON.stringify(data)}`});
  return r.output_text.trim();
 }catch(e){return localInsight(expenses);}
}

function localInsight(expenses){
 const totals={};
 expenses.forEach(expense=>{totals[expense.category]=(totals[expense.category]||0)+Number(expense.amount);});
 const topCategory=Object.keys(totals).sort((a,b)=>totals[b]-totals[a])[0];
 const total=expenses.reduce((sum,expense)=>sum+Number(expense.amount),0);
 return `Your highest spending category is ${topCategory}, totaling ₹${totals[topCategory].toFixed(2)}. Total spending is ₹${total.toFixed(2)}.`;
}
module.exports={categorizeExpense,spendingInsight};
