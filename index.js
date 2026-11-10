const express = require('express');
const fs = require('fs').promises;
//moodul POST päringute lahtiharutamiseks, parsimiseks
const bodyparser = require('body-parser');
//moodul andmebaasiga suhtlemiseks (koos async ehk ootamise osaga)
const mysql = require('mysql2/promise');
//moodul .env keskkonnam,uutujate lugemiseks
require('dotenv').config();
const session = require('express-session');

const loginCheck = require('./src/checkLogin');
const dateET = require('./src/dateTimeET');

const textRef = "public/txt/vanasonad.txt";
const regtextRef = "public/txt/visits.txt";

//käivitan funktsiooni express() ja annan nimeks app
const app = express();
//võtame kasutusele sessioonihalduri
app.use(session({secret: process.env.SES_SECRET, saveUninitialized: false, resave: true}));
//määrame renderdusmootori: EJS
app.set('view engine', 'ejs');
//määrame avalikuna kasutatava kataloogi
app.use(express.static('public'));
//määrame vormide sisu parsimise, kui false, siis ainult tekst
app.use(bodyparser.urlencoded({extended: true}));

//marsruudid
app.get('/', async (req, res)=>{
	const dayNow = dateET.day();
	const dateNow = dateET.fullDate(0);
	const timeNow = dateET.fullTime();
	let conn;
	try {
		let sqlReq = "SELECT filename, alttext FROM galleryphotos WHERE id=(SELECT MAX(id) FROM galleryphotos WHERE privacy=? AND deleted IS NULL)";
		const privacy = 3;
		conn = await mysql.createConnection({
			host: process.env.DB_HOST,
			user: process.env.DB_USER,
			password: process.env.DB_PASS,
			database: process.env.DB_NAME
		});
		const [rows, fields] = await conn.execute(sqlReq, [privacy]);
		let imgAlt = "Avalik foto";
		if(rows[0].alttext != ""){
			imgAlt = rows[0].alttext;
		}
		res.render('index', {dayNow: dayNow, dateNow: dateNow, timeNow: timeNow, imgFile: "gallery/normal/" + rows[0].filename, imgAlt: imgAlt});
	}
	catch (err) {
		res.render('index', {dayNow: dayNow, dateNow: dateNow, timeNow: timeNow, imgFile: "pic/vp_logo_small.png", imgAlt: "VP logo"});
	}
	finally {
		if(conn){
			await conn.end();
			//console.log("Andmebaasiühendus suletud!");
		}
	}
	//res.send('Express.js veeb läkski käima!');
	
});

//sisseloginud kasutajate avaleht
app.get('/home', loginCheck.isLogin, (req, res) => {
	res.render('home');
});

//väljalogimine
app.get('/logout', (req, res) => {
	//hävitame sessiooni
	req.session.destroy();
	res.redirect('/');
});

app.get('/vanasona', async (req, res)=>{
	try {
		const data = await fs.readFile(textRef, "utf8");
		let folkWisdom = data.split(";");
		res.render('vanasona', {wisdom: folkWisdom[Math.round(Math.random() * (folkWisdom.length - 1))]});
	}
	catch (err) {
		console.log(err);
		res.render('vanasona', {wisdom: 'Kahjuks ei leidnud ühtegi vanasõna!'});
	}
});

app.get('/regvisit', (req, res)=>{
	res.render('regvisit');
});

app.post('/regvisit', async (req, res)=>{
	try {
		await fs.open(regtextRef, 'a');
		await fs.appendFile(regtextRef, req.body.inputName + ';');
		res.render('regvisit');
	}
	catch (err) {
		console.log(err);
		res.render('regvisit');
	}
	
});

//Eesti filmi marsruudid
const eestiFilmRouter = require('./routes/eestifilmRoutes');
app.use('/eestifilm', eestiFilmRouter);

//galeriipiltide üleslaadimine
const galleryPhotoUploadRouter = require('./routes/galleryPhotoUploadRoutes');
app.use('/galleryPhotoUpload', galleryPhotoUploadRouter);

const galleryRouter = require('./routes/galleryRoutes');
app.use('/gallery', galleryRouter);

//kasutajakonto loomine
const signupRouter = require('./routes/signupRoutes');
app.use('/signup', signupRouter);

//sisselogimine
const signinRouter = require('./routes/signinRoutes');
app.use('/signin', signinRouter);

app.listen(5200);