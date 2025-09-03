// Main server page where all the routes are laid out, each route will have their own functions/files

const express = require('express')

const app = express()
const port = 3000

app.get( '/', (req, res) =>{
    res.send("this is the start of the server")
})

app.listen(port, (error) =>{
    if(!error){
        console.log("server is running on port " + port)
    }
    else{
        console.log("Error starting server", error)
    }
})