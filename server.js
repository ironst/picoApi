// restful api server

const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');
const Clarifai = require('clarifai');

const appClar = new Clarifai.App({
  apiKey: '6f77084e33644573ae24f1c36e86e0c1'
});

const db = knex({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    port : 5432,
    user : 'lijunchao',
    password : '',
    database : 'pico'
  }
});

const app = express();
app.use(bodyParser.json());
app.use(cors());

let database = {
    users: [
    ]
}

app.get('/', (req, res) => {
    res.json('success');
})

app.post('/signin', (req, res) => {
    const { email , password} = req.body;
    if (!email || !password) {
        return res.status(400).json('incorrect form submission');
    }

    db.select('email', 'hash').from('login')
    .where('email', '=', req.body.email)
    .then(data => {
        const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
        if (isValid) {
            return db.select('*').from('users').where('email', '=', req.body.email)
            .then(user => {
                res.json(user[0])
            })
            .catch(err => res.status(400).json('unable to get user'))
        } else {
            res.status(400).json('wrong credentials')
        }
    })
    .catch(err => res.status(400).json('wrong credentials'))
})

app.post('/register', (req, res) => {
    const { email , name, password} = req.body;
    if (!email || !name || !password) {
        return res.status(400).json('incorrect form submission');
    }

    const hash = bcrypt.hashSync(password);

    db.transaction(trx => {
        trx.insert({
            hash: hash,
            email: email
        })
        .into('login')
        .returning('email')
        .then(loginEmail => {
            db('users')
    .returning('*')
    .insert({
        email: loginEmail[0],
        name: name,
        joined: new Date()
    })
    .then(user => {
        res.json(user[0]);
    })
    
        })
        .then(trx.commit)
        .catch(trx.rollback)
    })
    .catch(err => {
        res.status(400).json('unable to register');
    })

    
})

app.get('/profile/:id', (req, res) => {
    const { id } = req.params;
    //return image count asscociated with id
    db.select('*').from('users').where({id:id}).then(user=>{
        if (user.length) {
            res.json(user[0]);
        } else {
            res.status(400).json('Not Found');
        }
    })
})

app.put('/image', (req, res) => {
    const { id } = req.body;
    // update user entries
    db('users')
  .where('id', '=', id)
  .increment('entries', 1)
  .returning('entries')
  .then(entries => {
    res.json(entries[0]);
  })
  .catch(err => {
    res.status(400).json('unable to get entries');
  })
})

app.post('/imageurl', (req, res) => {
    appClar.models.predict(
      Clarifai.FACE_DETECT_MODEL,
      // '53e1df302c079b3db8a0a36033ed2d15',
      req.body.input
    )
    .then(data => {
        res.json(data);
    })
    .catch(err => res.status(400).json('unable to work with api'))
})

app.listen(3000, () => {
    console.log('app is running');
})