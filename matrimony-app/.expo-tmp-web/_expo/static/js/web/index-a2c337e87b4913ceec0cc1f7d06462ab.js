__d(function(g,r,i,a,m,e,d){Object.defineProperty(e,"__esModule",{value:!0});var n=r(d[0]);Object.keys(n).forEach(function(t){"default"!==t&&"__esModule"!==t&&(t in e&&e[t]===n[t]||Object.defineProperty(e,t,{enumerable:!0,get:function(){return n[t]}}))})},1078,[1081]);
__d(function(g,r,i,a,m,_e,d){'use strict';Object.defineProperty(_e,'__esModule',{value:!0});var e=r(d[0]),t=r(d[1]),n=r(d[2]),s=r(d[3]);r(d[4]);
/**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
const o='analytics',c='https://www.googletagmanager.com/gtag/js',l=new t.Logger('@firebase/analytics'),u={"already-exists":"A Firebase Analytics instance with the appId {$id}  already exists. Only one Firebase Analytics instance can be created for each appId.","already-initialized":"initializeAnalytics() cannot be called again with different options than those it was initially called with. It can be called again with the same options to return the existing instance, or getAnalytics() can be used to get a reference to the already-initialized instance.","already-initialized-settings":"Firebase Analytics has already been initialized.settings() must be called before initializing any Analytics instanceor it will have no effect.","interop-component-reg-failed":'Firebase Analytics Interop Component failed to instantiate: {$reason}',"invalid-analytics-context":"Firebase Analytics is not supported in this environment. Wrap initialization of analytics in analytics.isSupported() to prevent initialization in unsupported environments. Details: {$errorInfo}","indexeddb-unavailable":"IndexedDB unavailable or restricted in this environment. Wrap initialization of analytics in analytics.isSupported() to prevent initialization in unsupported environments. Details: {$errorInfo}","fetch-throttle":"The config fetch request timed out while in an exponential backoff state. Unix timestamp in milliseconds when fetch request throttling ends: {$throttleEndTimeMillis}.","config-fetch-failed":'Dynamic config fetch failed: [{$httpStatus}] {$responseMessage}',"no-api-key":"The \"apiKey\" field is empty in the local Firebase config. Firebase Analytics requires this field tocontain a valid API key.","no-app-id":"The \"appId\" field is empty in the local Firebase config. Firebase Analytics requires this field tocontain a valid app ID.","no-client-id":'The "client_id" field is empty.',"invalid-gtag-resource":'Trusted Types detected an invalid gtag resource: {$gtagURL}.'},p=new n.ErrorFactory('analytics','Analytics',u);
/**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
function f(e){if(!e.startsWith(c)){const t=p.create("invalid-gtag-resource",{gtagURL:e});return l.warn(t.message),''}return e}function h(e){return Promise.all(e.map(e=>e.catch(e=>e)))}function y(e,t){let n;return window.trustedTypes&&(n=window.trustedTypes.createPolicy(e,t)),n}function w(e,t){const n=y('firebase-js-sdk-policy',{createScriptURL:f}),s=document.createElement('script'),o=`${c}?l=${e}&id=${t}`;s.src=n?n?.createScriptURL(o):o,s.async=!0,document.head.appendChild(s)}function I(e){let t=[];return Array.isArray(window[e])?t=window[e]:window[e]=t,t}async function b(e,t,n,s,o,c){const u=s[o];try{if(u)await t[u];else{const e=(await h(n)).find(e=>e.measurementId===o);e&&await t[e.appId]}}catch(e){l.error(e)}e("config",o,c)}async function v(e,t,n,s,o){try{let c=[];if(o&&o.send_to){let e=o.send_to;Array.isArray(e)||(e=[e]);const s=await h(n);for(const n of e){const e=s.find(e=>e.measurementId===n),o=e&&t[e.appId];if(!o){c=[];break}c.push(o)}}0===c.length&&(c=Object.values(t)),await Promise.all(c),e("event",s,o||{})}catch(e){l.error(e)}}function M(e,t,n,s){return async function(o,...c){try{if("event"===o){const[s,o]=c;await v(e,t,n,s,o)}else if("config"===o){const[o,l]=c;await b(e,t,n,s,o,l)}else if("consent"===o){const[t,n]=c;e("consent",t,n)}else if("get"===o){const[t,n,s]=c;e("get",t,n,s)}else if("set"===o){const[t]=c;e("set",t)}else e(o,...c)}catch(e){l.error(e)}}}function T(e,t,n,s,o){let c=function(...e){window[s].push(arguments)};return window[o]&&'function'==typeof window[o]&&(c=window[o]),window[o]=M(c,e,t,n),{gtagCore:c,wrappedGtag:window[o]}}function A(e){const t=window.document.getElementsByTagName('script');for(const n of Object.values(t))if(n.src&&n.src.includes(c)&&n.src.includes(e))return n;return null}
/**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */const D=new class{constructor(e={},t=1e3){this.throttleMetadata=e,this.intervalMillis=t}getThrottleMetadata(e){return this.throttleMetadata[e]}setThrottleMetadata(e,t){this.throttleMetadata[e]=t}deleteThrottleMetadata(e){delete this.throttleMetadata[e]}};function F(e){return new Headers({Accept:'application/json','x-goog-api-key':e})}async function E(e){const{appId:t,apiKey:n}=e,s={method:'GET',headers:F(n)},o="https://firebase.googleapis.com/v1alpha/projects/-/apps/{app-id}/webConfig".replace('{app-id}',t),c=await fetch(o,s);if(200!==c.status&&304!==c.status){let e='';try{const t=await c.json();t.error?.message&&(e=t.error.message)}catch(e){}throw p.create("config-fetch-failed",{httpStatus:c.status,responseMessage:e})}return c.json()}async function $(e,t=D,n){const{appId:s,apiKey:o,measurementId:c}=e.options;if(!s)throw p.create("no-app-id");if(!o){if(c)return{measurementId:c,appId:s};throw p.create("no-api-key")}const l=t.getThrottleMetadata(s)||{backoffCount:0,throttleEndTimeMillis:Date.now()},u=new _;return setTimeout(async()=>{u.abort()},void 0!==n?n:6e4),x({appId:s,apiKey:o,measurementId:c},l,u,t)}async function x(e,{throttleEndTimeMillis:t,backoffCount:s},o,c=D){const{appId:u,measurementId:p}=e;try{await P(o,t)}catch(e){if(p)return l.warn(`Timed out fetching this Firebase app's measurement ID from the server. Falling back to the measurement ID ${p} provided in the "measurementId" field in the local Firebase config. [${e?.message}]`),{appId:u,measurementId:p};throw e}try{const t=await E(e);return c.deleteThrottleMetadata(u),t}catch(t){const f=t;if(!C(f)){if(c.deleteThrottleMetadata(u),p)return l.warn(`Failed to fetch this Firebase app's measurement ID from the server. Falling back to the measurement ID ${p} provided in the "measurementId" field in the local Firebase config. [${f?.message}]`),{appId:u,measurementId:p};throw t}const h=503===Number(f?.customData?.httpStatus)?n.calculateBackoffMillis(s,c.intervalMillis,30):n.calculateBackoffMillis(s,c.intervalMillis),y={throttleEndTimeMillis:Date.now()+h,backoffCount:s+1};return c.setThrottleMetadata(u,y),l.debug(`Calling attemptFetch again in ${h} millis`),x(e,y,o,c)}}function P(e,t){return new Promise((n,s)=>{const o=Math.max(t-Date.now(),0),c=setTimeout(n,o);e.addEventListener(()=>{clearTimeout(c),s(p.create("fetch-throttle",{throttleEndTimeMillis:t}))})})}function C(e){if(!(e instanceof n.FirebaseError&&e.customData))return!1;const t=Number(e.customData.httpStatus);return 429===t||500===t||503===t||504===t}class _{constructor(){this.listeners=[]}addEventListener(e){this.listeners.push(e)}abort(){this.listeners.forEach(e=>e())}}
/**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */let k,z;async function j(e,t,n,s,o){if(o&&o.global)e("event",n,s);else{const o=await t;e("event",n,Object.assign({},s,{send_to:o}))}}async function B(e,t,n,s){if(s&&s.global)return e("set",{screen_name:n}),Promise.resolve();e("config",await t,{update:!0,screen_name:n})}async function L(e,t,n,s){if(s&&s.global)return e("set",{user_id:n}),Promise.resolve();e("config",await t,{update:!0,user_id:n})}async function S(e,t,n,s){if(s&&s.global){const t={};for(const e of Object.keys(n))t[`user_properties.${e}`]=n[e];return e("set",t),Promise.resolve()}e("config",await t,{update:!0,user_properties:n})}async function O(e,t){const n=await t;return new Promise((t,s)=>{e("get",n,'client_id',e=>{e||s(p.create("no-client-id")),t(e)})})}async function U(e,t){const n=await e;window[`ga-disable-${n}`]=!t}function N(e){z=e}function K(e){k=e}
/**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */async function q(){if(!n.isIndexedDBAvailable())return l.warn(p.create("indexeddb-unavailable",{errorInfo:'IndexedDB is not available in this environment.'}).message),!1;try{await n.validateIndexedDBOpenable()}catch(e){return l.warn(p.create("indexeddb-unavailable",{errorInfo:e?.toString()}).message),!1}return!0}async function R(e,t,n,s,o,c,u){const p=$(e);p.then(t=>{n[t.measurementId]=t.appId,e.options.measurementId&&t.measurementId!==e.options.measurementId&&l.warn(`The measurement ID in the local Firebase config (${e.options.measurementId}) does not match the measurement ID fetched from the server (${t.measurementId}). To ensure analytics events are always sent to the correct Analytics property, update the measurement ID field in the local config or remove it from the local config.`)}).catch(e=>l.error(e)),t.push(p);const f=q().then(e=>e?s.getId():void 0),[h,y]=await Promise.all([p,f]);A(c)||w(c,h.measurementId),z&&(o("consent",'default',z),N(void 0)),o('js',new Date);const I=u?.config??{};return I.origin='firebase',I.update=!0,null!=y&&(I.firebase_id=y),o("config",h.measurementId,I),k&&(o("set",k),K(void 0)),h.measurementId}
/**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */class G{constructor(e){this.app=e}_delete(){return delete V[this.app.options.appId],Promise.resolve()}}let V={},W=[];const H={};let J,Q,X='dataLayer',Y='gtag',Z=!1;function ee(){const e=[];if(n.isBrowserExtension()&&e.push('This is a browser extension environment.'),n.areCookiesEnabled()||e.push('Cookies are not available.'),e.length>0){const t=e.map((e,t)=>`(${t+1}) ${e}`).join(' '),n=p.create("invalid-analytics-context",{errorInfo:t});l.warn(n.message)}}function te(e,t,n){ee();const s=e.options.appId;if(!s)throw p.create("no-app-id");if(!e.options.apiKey){if(!e.options.measurementId)throw p.create("no-api-key");l.warn(`The "apiKey" field is empty in the local Firebase config. This is needed to fetch the latest measurement ID for this Firebase app. Falling back to the measurement ID ${e.options.measurementId} provided in the "measurementId" field in the local Firebase config.`)}if(null!=V[s])throw p.create("already-exists",{id:s});if(!Z){I(X);const{wrappedGtag:e,gtagCore:t}=T(V,W,H,X,Y);Q=e,J=t,Z=!0}V[s]=R(e,W,H,t,J,X,n);return new G(e)}function ne(t,s={}){const c=e._getProvider(t,o);if(c.isInitialized()){const e=c.getImmediate();if(n.deepEqual(s,c.getOptions()))return e;throw p.create("already-initialized")}return c.initialize({options:s})}function ae(e,t,s){e=n.getModularInstance(e),S(Q,V[e.app.options.appId],t,s).catch(e=>l.error(e))}function ie(e,t,s,o){e=n.getModularInstance(e),j(Q,V[e.app.options.appId],t,s,o).catch(e=>l.error(e))}const re="@firebase/analytics",se="0.10.22";e._registerComponent(new s.Component(o,(e,{options:t})=>te(e.getProvider('app').getImmediate(),e.getProvider('installations-internal').getImmediate(),t),"PUBLIC")),e._registerComponent(new s.Component('analytics-internal',function(e){try{const t=e.getProvider(o).getImmediate();return{logEvent:(e,n,s)=>ie(t,e,n,s),setUserProperties:(e,n)=>ae(t,e,n)}}catch(e){throw p.create("interop-component-reg-failed",{reason:e})}},"PRIVATE")),e.registerVersion(re,se),e.registerVersion(re,se,'cjs2020'),_e.getAnalytics=function(t=e.getApp()){t=n.getModularInstance(t);const s=e._getProvider(t,o);return s.isInitialized()?s.getImmediate():ne(t)},_e.getGoogleAnalyticsClientId=async function(e){return e=n.getModularInstance(e),O(Q,V[e.app.options.appId])},_e.initializeAnalytics=ne,_e.isSupported=async function(){if(n.isBrowserExtension())return!1;if(!n.areCookiesEnabled())return!1;if(!n.isIndexedDBAvailable())return!1;try{return await n.validateIndexedDBOpenable()}catch(e){return!1}},_e.logEvent=ie,_e.setAnalyticsCollectionEnabled=function(e,t){e=n.getModularInstance(e),U(V[e.app.options.appId],t).catch(e=>l.error(e))},_e.setConsent=function(e){Q?Q("consent",'update',e):N(e)},_e.setCurrentScreen=function(e,t,s){e=n.getModularInstance(e),B(Q,V[e.app.options.appId],t,s).catch(e=>l.error(e))},_e.setDefaultEventParameters=function(e){Q?Q("set",e):K(e)},_e.setUserId=function(e,t,s){e=n.getModularInstance(e),L(Q,V[e.app.options.appId],t,s).catch(e=>l.error(e))},_e.setUserProperties=ae,_e.settings=function(e){if(Z)throw p.create("already-initialized");e.dataLayerName&&(X=e.dataLayerName),e.gtagName&&(Y=e.gtagName)}},1081,[890,894,892,891,1082]);
__d(function(g,r,i,a,m,_e,d){'use strict';Object.defineProperty(_e,'__esModule',{value:!0});var t=r(d[0]),e=r(d[1]),n=r(d[2]),o=r(d[3]);const s="@firebase/installations",c="0.6.22",u=`w:${c}`,f='FIS_v2',p={"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"not-registered":'Firebase Installation is not registered.',"installation-not-found":'Firebase Installation not found.',"request-failed":'{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',"app-offline":'Could not process request. Application offline.',"delete-pending-registration":"Can't delete installation while there is a pending registration request."},l=new n.ErrorFactory('installations','Installations',p);function w(t){return t instanceof n.FirebaseError&&t.code.includes("request-failed")}
/**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */function h({projectId:t}){return`https://firebaseinstallations.googleapis.com/v1/projects/${t}/installations`}function y(t){return{token:t.token,requestStatus:2,expiresIn:(e=t.expiresIn,Number(e.replace('s','000'))),creationTime:Date.now()};var e}async function v(t,e){const n=(await e.json()).error;return l.create("request-failed",{requestName:t,serverCode:n.code,serverMessage:n.message,serverStatus:n.status})}function C({apiKey:t}){return new Headers({'Content-Type':'application/json',Accept:'application/json','x-goog-api-key':t})}function S(t,{refreshToken:e}){const n=C(t);return n.append('Authorization',b(e)),n}async function I(t){const e=await t();return e.status>=500&&e.status<600?t():e}function b(t){return`${f} ${t}`}
/**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */async function T({appConfig:t,heartbeatServiceProvider:e},{fid:n}){const o=h(t),s=C(t),c=e.getImmediate({optional:!0});if(c){const t=await c.getHeartbeatsHeader();t&&s.append('x-firebase-client',t)}const p={fid:n,authVersion:f,appId:t.appId,sdkVersion:u},l={method:'POST',headers:s,body:JSON.stringify(p)},w=await I(()=>fetch(o,l));if(w.ok){const t=await w.json();return{fid:t.fid||n,registrationStatus:2,refreshToken:t.refreshToken,authToken:y(t.authToken)}}throw await v('Create Installation',w)}
/**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */function k(t){return new Promise(e=>{setTimeout(e,t)})}
/**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
/**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
const P=/^[cdef][\w-]{21}$/;function j(){try{const t=new Uint8Array(17);(self.crypto||self.msCrypto).getRandomValues(t),t[0]=112+t[0]%16;const e=q(t);return P.test(e)?e:""}catch{return""}}function q(t){var e;return(e=t,btoa(String.fromCharCode(...e)).replace(/\+/g,'-').replace(/\//g,'_')).substr(0,22)}
/**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */function $(t){return`${t.appName}!${t.appId}`}
/**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */const E=new Map;function D(t,e){const n=$(t);N(n,e),O(n,e)}function _(t,e){V();const n=$(t);let o=E.get(n);o||(o=new Set,E.set(n,o)),o.add(e)}function A(t,e){const n=$(t),o=E.get(n);o&&(o.delete(e),0===o.size&&E.delete(n),x())}function N(t,e){const n=E.get(t);if(n)for(const t of n)t(e)}function O(t,e){const n=V();n&&n.postMessage({key:t,fid:e}),x()}let F=null;function V(){return!F&&'BroadcastChannel'in self&&(F=new BroadcastChannel('[Firebase] FID Change'),F.onmessage=t=>{N(t.data.key,t.data.fid)}),F}function x(){0===E.size&&F&&(F.close(),F=null)}
/**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */const M='firebase-installations-store';let H=null;function L(){return H||(H=o.openDB("firebase-installations-database",1,{upgrade:(t,e)=>{if(0===e)t.createObjectStore(M)}})),H}async function B(t,e){const n=$(t),o=(await L()).transaction(M,'readwrite'),s=o.objectStore(M),c=await s.get(n);return await s.put(e,n),await o.done,c&&c.fid===e.fid||D(t,e.fid),e}async function K(t){const e=$(t),n=(await L()).transaction(M,'readwrite');await n.objectStore(M).delete(e),await n.done}async function z(t,e){const n=$(t),o=(await L()).transaction(M,'readwrite'),s=o.objectStore(M),c=await s.get(n),u=e(c);return void 0===u?await s.delete(n):await s.put(u,n),await o.done,!u||c&&c.fid===u.fid||D(t,u.fid),u}
/**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */async function J(t){let e;const n=await z(t.appConfig,n=>{const o=R(n),s=U(t,o);return e=s.registrationPromise,s.installationEntry});return""===n.fid?{installationEntry:await e}:{installationEntry:n,registrationPromise:e}}function R(t){return X(t||{fid:j(),registrationStatus:0})}function U(t,e){if(0===e.registrationStatus){if(!navigator.onLine){return{installationEntry:e,registrationPromise:Promise.reject(l.create("app-offline"))}}const n={fid:e.fid,registrationStatus:1,registrationTime:Date.now()};return{installationEntry:n,registrationPromise:G(t,n)}}return 1===e.registrationStatus?{installationEntry:e,registrationPromise:Q(t)}:{installationEntry:e}}async function G(t,e){try{const n=await T(t,e);return B(t.appConfig,n)}catch(n){throw w(n)&&409===n.customData.serverCode?await K(t.appConfig):await B(t.appConfig,{fid:e.fid,registrationStatus:0}),n}}async function Q(t){let e=await W(t.appConfig);for(;1===e.registrationStatus;)await k(100),e=await W(t.appConfig);if(0===e.registrationStatus){const{installationEntry:e,registrationPromise:n}=await J(t);return n||e}return e}function W(t){return z(t,t=>{if(!t)throw l.create("installation-not-found");return X(t)})}function X(t){return 1===(e=t).registrationStatus&&e.registrationTime+1e4<Date.now()?{fid:t.fid,registrationStatus:0}:t;var e;
/**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */}async function Y({appConfig:t,heartbeatServiceProvider:e},n){const o=Z(t,n),s=S(t,n),c=e.getImmediate({optional:!0});if(c){const t=await c.getHeartbeatsHeader();t&&s.append('x-firebase-client',t)}const f={installation:{sdkVersion:u,appId:t.appId}},p={method:'POST',headers:s,body:JSON.stringify(f)},l=await I(()=>fetch(o,p));if(l.ok){return y(await l.json())}throw await v('Generate Auth Token',l)}function Z(t,{fid:e}){return`${h(t)}/${e}/authTokens:generate`}
/**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */async function tt(t,e=!1){let n;const o=await z(t.appConfig,o=>{if(!it(o))throw l.create("not-registered");const s=o.authToken;if(!e&&rt(s))return o;if(1===s.requestStatus)return n=et(t,e),o;{if(!navigator.onLine)throw l.create("app-offline");const e=st(o);return n=at(t,e),e}});return n?await n:o.authToken}async function et(t,e){let n=await nt(t.appConfig);for(;1===n.authToken.requestStatus;)await k(100),n=await nt(t.appConfig);const o=n.authToken;return 0===o.requestStatus?tt(t,e):o}function nt(t){return z(t,t=>{if(!it(t))throw l.create("not-registered");const e=t.authToken;return 1===(n=e).requestStatus&&n.requestTime+1e4<Date.now()?Object.assign({},t,{authToken:{requestStatus:0}}):t;var n;
/**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */})}async function at(t,e){try{const n=await Y(t,e),o=Object.assign({},e,{authToken:n});return await B(t.appConfig,o),n}catch(n){if(!w(n)||401!==n.customData.serverCode&&404!==n.customData.serverCode){const n=Object.assign({},e,{authToken:{requestStatus:0}});await B(t.appConfig,n)}else await K(t.appConfig);throw n}}function it(t){return void 0!==t&&2===t.registrationStatus}function rt(t){return 2===t.requestStatus&&!ot(t)}function ot(t){const e=Date.now();return e<t.creationTime||t.creationTime+t.expiresIn<e+36e5}function st(t){const e={requestStatus:1,requestTime:Date.now()};return Object.assign({},t,{authToken:e})}async function ct(t){const e=t,{installationEntry:n,registrationPromise:o}=await J(e);return o?o.catch(console.error):tt(e).catch(console.error),n.fid}
/**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */async function ut(t,e=!1){const n=t;await ft(n);return(await tt(n,e)).token}async function ft(t){const{registrationPromise:e}=await J(t);e&&await e}
/**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */async function pt(t,e){const n=lt(t,e),o={method:'DELETE',headers:S(t,e)},s=await I(()=>fetch(n,o));if(!s.ok)throw await v('Delete Installation',s)}function lt(t,{fid:e}){return`${h(t)}/${e}`}
/**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
/**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
function dt(t){if(!t||!t.options)throw gt('App Configuration');if(!t.name)throw gt('App Name');const e=['projectId','apiKey','appId'];for(const n of e)if(!t.options[n])throw gt(n);return{appName:t.name,projectId:t.options.projectId,apiKey:t.options.apiKey,appId:t.options.appId}}function gt(t){return l.create("missing-app-config-values",{valueName:t})}
/**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */const wt='installations',ht=e=>{const n=e.getProvider('app').getImmediate();return{app:n,appConfig:dt(n),heartbeatServiceProvider:t._getProvider(n,'heartbeat'),_delete:()=>Promise.resolve()}},mt=e=>{const n=e.getProvider('app').getImmediate(),o=t._getProvider(n,wt).getImmediate();return{getId:()=>ct(o),getToken:t=>ut(o,t)}};t._registerComponent(new e.Component(wt,ht,"PUBLIC")),t._registerComponent(new e.Component("installations-internal",mt,"PRIVATE")),t.registerVersion(s,c),t.registerVersion(s,c,'cjs2020'),_e.deleteInstallations=async function(t){const{appConfig:e}=t,n=await z(e,t=>{if(!t||0!==t.registrationStatus)return t});if(n){if(1===n.registrationStatus)throw l.create("delete-pending-registration");if(2===n.registrationStatus){if(!navigator.onLine)throw l.create("app-offline");await pt(e,n),await K(e)}}}
/**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */,_e.getId=ct,_e.getInstallations=
/**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
function(e=t.getApp()){return t._getProvider(e,'installations').getImmediate()},_e.getToken=ut,_e.onIdChange=function(t,e){const{appConfig:n}=t;return _(n,e),()=>{A(n,e)}}},1082,[890,891,892,1083]);
__d(function(g,r,i,a,m,e,d){Object.defineProperty(e,"__esModule",{value:!0}),e.deleteDB=function(t,{blocked:o}={}){const s=indexedDB.deleteDatabase(t);o&&s.addEventListener('blocked',n=>o(n.oldVersion,n));return(0,n.w)(s).then(()=>{})},e.openDB=function(t,o,{blocked:s,upgrade:c,blocking:l,terminated:u}={}){const f=indexedDB.open(t,o),p=(0,n.w)(f);c&&f.addEventListener('upgradeneeded',t=>{c((0,n.w)(f.result),t.oldVersion,t.newVersion,(0,n.w)(f.transaction),t)});s&&f.addEventListener('blocked',n=>s(n.oldVersion,n.newVersion,n));return p.then(n=>{u&&n.addEventListener('close',()=>u()),l&&n.addEventListener('versionchange',n=>l(n.oldVersion,n.newVersion,n))}).catch(()=>{}),p},Object.defineProperty(e,"unwrap",{enumerable:!0,get:function(){return n.u}}),Object.defineProperty(e,"wrap",{enumerable:!0,get:function(){return n.w}});var n=r(d[0]);const t=['get','getKey','getAll','getAllKeys','count'],o=['put','add','delete','clear'],s=new Map;function c(n,c){if(!(n instanceof IDBDatabase)||c in n||'string'!=typeof c)return;if(s.get(c))return s.get(c);const l=c.replace(/FromIndex$/,''),u=c!==l,f=o.includes(l);if(!(l in(u?IDBIndex:IDBObjectStore).prototype)||!f&&!t.includes(l))return;const p=async function(n,...t){const o=this.transaction(n,f?'readwrite':'readonly');let s=o.store;return u&&(s=s.index(t.shift())),(await Promise.all([s[l](...t),f&&o.done]))[0]};return s.set(c,p),p}(0,n.r)(n=>Object.assign({},n,{get:(t,o,s)=>c(t,o)||n.get(t,o,s),has:(t,o)=>!!c(t,o)||n.has(t,o)}))},1083,[1084]);
__d(function(g,r,i,a,m,e,d){Object.defineProperty(e,"__esModule",{value:!0}),e.i=e.a=void 0,e.r=function(t){I=t(I)},e.u=void 0,e.w=b;const t=(t,n)=>n.some(n=>t instanceof n);let n,o;e.i=t;const s=new WeakMap,c=new WeakMap,u=new WeakMap,f=new WeakMap,p=e.a=new WeakMap;function v(t){const n=new Promise((n,o)=>{const s=()=>{t.removeEventListener('success',c),t.removeEventListener('error',u)},c=()=>{n(b(t.result)),s()},u=()=>{o(t.error),s()};t.addEventListener('success',c),t.addEventListener('error',u)});return n.then(n=>{n instanceof IDBCursor&&s.set(n,t)}).catch(()=>{}),p.set(n,t),n}function D(t){if(c.has(t))return;const n=new Promise((n,o)=>{const s=()=>{t.removeEventListener('complete',c),t.removeEventListener('error',u),t.removeEventListener('abort',u)},c=()=>{n(),s()},u=()=>{o(t.error||new DOMException('AbortError','AbortError')),s()};t.addEventListener('complete',c),t.addEventListener('error',u),t.addEventListener('abort',u)});c.set(t,n)}let I={get(t,n,o){if(t instanceof IDBTransaction){if('done'===n)return c.get(t);if('objectStoreNames'===n)return t.objectStoreNames||u.get(t);if('store'===n)return o.objectStoreNames[1]?void 0:o.objectStore(o.objectStoreNames[0])}return b(t[n])},set:(t,n,o)=>(t[n]=o,!0),has:(t,n)=>t instanceof IDBTransaction&&('done'===n||'store'===n)||n in t};function B(c){return'function'==typeof c?(f=c)!==IDBDatabase.prototype.transaction||'objectStoreNames'in IDBTransaction.prototype?(o||(o=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])).includes(f)?function(...t){return f.apply(E(this),t),b(s.get(this))}:function(...t){return b(f.apply(E(this),t))}:function(t,...n){const o=f.call(E(this),t,...n);return u.set(o,t.sort?t.sort():[t]),b(o)}:(c instanceof IDBTransaction&&D(c),t(c,n||(n=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction]))?new Proxy(c,I):c);var f}function b(t){if(t instanceof IDBRequest)return v(t);if(f.has(t))return f.get(t);const n=B(t);return n!==t&&(f.set(t,n),p.set(n,t)),n}const E=t=>p.get(t);e.u=E},1084,[]);