const express = require("express");
const app = express();

const PORT = process.env.PORT || 8000;

app.use(express.json());
app.use(express.urlencoded({ extended: true}));

//Array to keep track of Transaction history
const Transactions = [];

app.listen(PORT, () => {
    console.log("Server Listening on PORT:", PORT);
  });

/*
Add end point that accepts a transaction from
HTTP method "post" in route "/add"
*/
app.post("/add", (req, res) => {
    const transaction = req.body;
    Transactions.push(transaction); 

    res.status(200);
    res.json({msg: "Request received."});
    
});

//JavaScript object that is used to keep account of how many points spent(value) per payer (key)
const TOTAL = {};

/*
Spend end point that spends a user's points.
HTTP method "post" in route "/spend"
*/
app.post("/spend", (req,res) => {
    //sort Transactions from oldest to youngest
    Transactions.sort((a,b) => {
        return Date.parse(a.timestamp) - Date.parse(b.timestamp)
    });
    
    //total of User's points
    let totalAvailablePoints = 0;

    for (let i = 0; i < Transactions.length; i++) {
        //increment current total by the points of the current payer to get total across all payers
        totalAvailablePoints += Transactions[i].points;

        //initialize all points for TOTAL to 0 to later be used to add on payments 
        TOTAL[Transactions[i].payer] = 0
    }

    let pointsToSpend = req.body.points;
  
    //Cannot spend more than available points
    if (pointsToSpend > totalAvailablePoints) {
        res.status(400);
        res.send("User doesn't have enough points.");
    }
    //Cannot spend negative points
    else if (pointsToSpend < 0) {
        res.status(400);
        res.send("Cannot spend negative points.")
    }
    else {
        //iterate through transactions to see if their exists a negative balance in any of the payers' points
        for (let transaction of Transactions) {
            //if there exists a negative balance, add that to the points a user can spend.
            //This is because taking out -200 is equivalent to spending 200 more on a user's pointsToSpend
            if (transaction.points < 0) {
                pointsToSpend += -transaction.points;
            }
        }
        for (let transaction of Transactions) {
            let payer = transaction.payer;
            let point = transaction.points;

            //When we encounter the negative point we iterated through in the previous for loop,
            //add that amount to the TOTAL and skip. (Accounts for consecutive spending).
            if (point < 0) {
                TOTAL[payer] += -point;
                continue;
            }

            //Use Math.min to determine how many points can be deducted from the current transaction.
            //pointsToSpend represents remaining points that need to be spent and point represents the current points available
            TOTAL[payer] += -Math.min(pointsToSpend, point);
            pointsToSpend = pointsToSpend - Math.min(pointsToSpend, point);
            
        }
    
        //iterate through key, value pairs of TOTAL object
        for (const [key, value] of Object.entries(TOTAL)) {
            //Create new addingToOG JavaScript object to add back into Transactions to reflect accurate balance in /balance
            let addingToOG = {"payer": key, 
                              "points": value,
                              "timestamp": new Date().toISOString()};

            Transactions.push(addingToOG);
          }

        res.send(TOTAL);
        res.status(200);
    }
    
});

/*
Balance end point which displays the User's balance.
HTTP method "get" in route "/balance"
*/
app.get("/balance", (req, res) => {
    //JavaScript object to keep track of unique payers and their points
    const nonDupeTransactions = {};

    for (const transaction of Transactions) {
      //using 'in' operator to check to see if duplicate payer exists or not
      if (transaction.payer in nonDupeTransactions) {
        nonDupeTransactions[transaction.payer] += transaction.points;
      }
      else {
        nonDupeTransactions[transaction.payer] = transaction.points;
      }
    }
    res.send(nonDupeTransactions);
    res.status(200);
});