require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const morgan = require('morgan');
const appConfig = require('../config/app');
const { connectDatabase } = require('../services/database');
const authRoutes = require('../routes/auth');
const dashboardRoutes = require('../routes/dashboard');
const apiRoutes = require('../routes/api');

async function bootstrap() {
  await connectDatabase();

  const app = express();
  app.set('trust proxy', 1);
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(
    helmet({
      contentSecurityPolicy: false
    })
  );
  app.use(morgan('dev'));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(
    session({
      secret: appConfig.sessionSecret,
      proxy: process.env.NODE_ENV === 'production',
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: appConfig.mongoUri
      }),
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000
      }
    })
  );
  app.use(express.static(path.join(__dirname, 'public')));

  app.use((req, res, next) => {
    res.locals.currentUser = req.session.discordAuth?.user || null;
    res.locals.flash = req.session.flash || null;
    if (req.session.flash) {
      delete req.session.flash;
    }
    next();
  });

  app.get('/', (_req, res) => {
    res.render('home', {
      title: 'Discord Language Bot'
    });
  });

  app.use('/auth', authRoutes);
  app.use('/dashboard', dashboardRoutes);
  app.use('/api', apiRoutes);

  app.use((req, res) => {
    res.status(404).render('error', {
      title: 'Page not found',
      statusCode: 404,
      message: `No route matched ${req.originalUrl}.`
    });
  });

  app.listen(appConfig.webPort, appConfig.appHost, () => {
    console.log(`Web panel listening on ${appConfig.appBaseUrl}`);
  });
}

bootstrap().catch((error) => {
  console.error('Web bootstrap failed:', error);
  process.exit(1);
});
