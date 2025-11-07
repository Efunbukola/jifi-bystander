// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  //api_url:'http://januke-api-env.eba-vv6cgtrd.us-east-1.elasticbeanstalk.com/'
  api_url:'https://ade-backend.ngrok.app/',
  stripe_public_key:'pk_test_51R5u1nCOZ0AVHpeZihw4oVjDRG4A2PvPSWz5EQuA329EHVOkQZeo2CwJMDO0y2pG9elEYdsUn6QUE4Jxx4QjXCD400Ifg8wLb5'
};


/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
