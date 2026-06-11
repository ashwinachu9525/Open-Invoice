/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./worker/index.ts":
/*!*************************!*\
  !*** ./worker/index.ts ***!
  \*************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval(__webpack_require__.ts("/// <reference lib=\"webworker\" />\n// @ts-ignore\nconst swSelf = self;\nself.addEventListener(\"push\", (event)=>{\n    if (event.data) {\n        try {\n            const data = event.data.json();\n            const options = {\n                body: data.body,\n                icon: \"/icon512_maskable.png\",\n                badge: \"/icon512_rounded.png\",\n                vibrate: [\n                    100,\n                    50,\n                    100\n                ],\n                data: {\n                    url: data.url || \"/\"\n                }\n            };\n            event.waitUntil(swSelf.registration.showNotification(data.title, options));\n        } catch (e) {\n            // If it's not JSON, fallback to text\n            event.waitUntil(swSelf.registration.showNotification(event.data.text()));\n        }\n    }\n});\nself.addEventListener(\"notificationclick\", (event)=>{\n    event.notification.close();\n    if (event.notification.data?.url) {\n        event.waitUntil(swSelf.clients.matchAll({\n            type: \"window\",\n            includeUncontrolled: true\n        }).then((clientList)=>{\n            for (const client of clientList){\n                if (client.url === event.notification.data.url && \"focus\" in client) {\n                    return client.focus();\n                }\n            }\n            if (swSelf.clients.openWindow) {\n                return swSelf.clients.openWindow(event.notification.data.url);\n            }\n        }));\n    }\n});\n\n\n;\n    // Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (function () {\n        var _a, _b;\n        // Legacy CSS implementations will `eval` browser code in a Node.js context\n        // to extract CSS. For backwards compatibility, we need to check we're in a\n        // browser context before continuing.\n        if (typeof self !== 'undefined' &&\n            // No-JS mode does not inject these helpers:\n            '$RefreshHelpers$' in self) {\n            // @ts-ignore __webpack_module__ is global\n            var currentExports = module.exports;\n            // @ts-ignore __webpack_module__ is global\n            var prevSignature = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevSignature) !== null && _b !== void 0 ? _b : null;\n            // This cannot happen in MainTemplate because the exports mismatch between\n            // templating and execution.\n            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);\n            // A module can be accepted automatically based on its exports, e.g. when\n            // it is a Refresh Boundary.\n            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {\n                // Save the previous exports signature on update so we can compare the boundary\n                // signatures. We avoid saving exports themselves since it causes memory leaks (https://github.com/vercel/next.js/pull/53797)\n                module.hot.dispose(function (data) {\n                    data.prevSignature =\n                        self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports);\n                });\n                // Unconditionally accept an update to this module, we'll check if it's\n                // still a Refresh Boundary later.\n                // @ts-ignore importMeta is replaced in the loader\n                /* unsupported import.meta.webpackHot */ undefined.accept();\n                // This field is set when the previous version of this module was a\n                // Refresh Boundary, letting us know we need to check for invalidation or\n                // enqueue an update.\n                if (prevSignature !== null) {\n                    // A boundary can become ineligible if its exports are incompatible\n                    // with the previous exports.\n                    //\n                    // For example, if you add/remove/change exports, we'll want to\n                    // re-execute the importing modules, and force those components to\n                    // re-render. Similarly, if you convert a class component to a\n                    // function, we want to invalidate the boundary.\n                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevSignature, self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports))) {\n                        module.hot.invalidate();\n                    }\n                    else {\n                        self.$RefreshHelpers$.scheduleUpdate();\n                    }\n                }\n            }\n            else {\n                // Since we just executed the code for the module, it's possible that the\n                // new exports made it ineligible for being a boundary.\n                // We only care about the case when we were _previously_ a boundary,\n                // because we already accepted this update (accidental side effect).\n                var isNoLongerABoundary = prevSignature !== null;\n                if (isNoLongerABoundary) {\n                    module.hot.invalidate();\n                }\n            }\n        }\n    })();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi93b3JrZXIvaW5kZXgudHMiLCJtYXBwaW5ncyI6IkFBQUEsaUNBQWlDO0FBRWpDLGFBQWE7QUFFYixNQUFNQSxTQUFTQztBQUVmQSxLQUFLQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUNDO0lBQzdCLElBQUlBLE1BQU1DLElBQUksRUFBRTtRQUNkLElBQUk7WUFDRixNQUFNQSxPQUFPRCxNQUFNQyxJQUFJLENBQUNDLElBQUk7WUFFNUIsTUFBTUMsVUFBVTtnQkFDZEMsTUFBTUgsS0FBS0csSUFBSTtnQkFDZkMsTUFBTTtnQkFDTkMsT0FBTztnQkFDUEMsU0FBUztvQkFBQztvQkFBSztvQkFBSTtpQkFBSTtnQkFDdkJOLE1BQU07b0JBQ0pPLEtBQUtQLEtBQUtPLEdBQUcsSUFBSTtnQkFDbkI7WUFDRjtZQUVBUixNQUFNUyxTQUFTLENBQUNaLE9BQU9hLFlBQVksQ0FBQ0MsZ0JBQWdCLENBQUNWLEtBQUtXLEtBQUssRUFBRVQ7UUFDbkUsRUFBRSxPQUFPVSxHQUFHO1lBQ1YscUNBQXFDO1lBQ3JDYixNQUFNUyxTQUFTLENBQUNaLE9BQU9hLFlBQVksQ0FBQ0MsZ0JBQWdCLENBQUNYLE1BQU1DLElBQUksQ0FBQ2EsSUFBSTtRQUN0RTtJQUNGO0FBQ0Y7QUFFQWhCLEtBQUtDLGdCQUFnQixDQUFDLHFCQUFxQixDQUFDQztJQUMxQ0EsTUFBTWUsWUFBWSxDQUFDQyxLQUFLO0lBRXhCLElBQUloQixNQUFNZSxZQUFZLENBQUNkLElBQUksRUFBRU8sS0FBSztRQUNoQ1IsTUFBTVMsU0FBUyxDQUNiWixPQUFPb0IsT0FBTyxDQUNYQyxRQUFRLENBQUM7WUFBRUMsTUFBTTtZQUFVQyxxQkFBcUI7UUFBSyxHQUNyREMsSUFBSSxDQUFDLENBQUNDO1lBQ0wsS0FBSyxNQUFNQyxVQUFVRCxXQUFZO2dCQUMvQixJQUFJQyxPQUFPZixHQUFHLEtBQUtSLE1BQU1lLFlBQVksQ0FBQ2QsSUFBSSxDQUFDTyxHQUFHLElBQUksV0FBV2UsUUFBUTtvQkFDbkUsT0FBT0EsT0FBT0MsS0FBSztnQkFDckI7WUFDRjtZQUNBLElBQUkzQixPQUFPb0IsT0FBTyxDQUFDUSxVQUFVLEVBQUU7Z0JBQzdCLE9BQU81QixPQUFPb0IsT0FBTyxDQUFDUSxVQUFVLENBQUN6QixNQUFNZSxZQUFZLENBQUNkLElBQUksQ0FBQ08sR0FBRztZQUM5RDtRQUNGO0lBRU47QUFDRiIsInNvdXJjZXMiOlsiL1VzZXJzL2Fzd2luL0RvY3VtZW50cy9wZXJzb25hbC9PcGVuLUludm9pY2Uvd29ya2VyL2luZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vLyA8cmVmZXJlbmNlIGxpYj1cIndlYndvcmtlclwiIC8+XG5cbi8vIEB0cy1pZ25vcmVcbmRlY2xhcmUgY29uc3Qgc2VsZjogU2VydmljZVdvcmtlckdsb2JhbFNjb3BlXG5jb25zdCBzd1NlbGYgPSBzZWxmIGFzIGFueVxuXG5zZWxmLmFkZEV2ZW50TGlzdGVuZXIoXCJwdXNoXCIsIChldmVudDogYW55KSA9PiB7XG4gIGlmIChldmVudC5kYXRhKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGRhdGEgPSBldmVudC5kYXRhLmpzb24oKVxuICAgICAgXG4gICAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgICBib2R5OiBkYXRhLmJvZHksXG4gICAgICAgIGljb246IFwiL2ljb241MTJfbWFza2FibGUucG5nXCIsIC8vIEFzc3VtaW5nIGljb24gZXhpc3RzXG4gICAgICAgIGJhZGdlOiBcIi9pY29uNTEyX3JvdW5kZWQucG5nXCIsXG4gICAgICAgIHZpYnJhdGU6IFsxMDAsIDUwLCAxMDBdLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgdXJsOiBkYXRhLnVybCB8fCBcIi9cIixcbiAgICAgICAgfSxcbiAgICAgIH1cblxuICAgICAgZXZlbnQud2FpdFVudGlsKHN3U2VsZi5yZWdpc3RyYXRpb24uc2hvd05vdGlmaWNhdGlvbihkYXRhLnRpdGxlLCBvcHRpb25zKSlcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAvLyBJZiBpdCdzIG5vdCBKU09OLCBmYWxsYmFjayB0byB0ZXh0XG4gICAgICBldmVudC53YWl0VW50aWwoc3dTZWxmLnJlZ2lzdHJhdGlvbi5zaG93Tm90aWZpY2F0aW9uKGV2ZW50LmRhdGEudGV4dCgpKSlcbiAgICB9XG4gIH1cbn0pXG5cbnNlbGYuYWRkRXZlbnRMaXN0ZW5lcihcIm5vdGlmaWNhdGlvbmNsaWNrXCIsIChldmVudDogYW55KSA9PiB7XG4gIGV2ZW50Lm5vdGlmaWNhdGlvbi5jbG9zZSgpXG5cbiAgaWYgKGV2ZW50Lm5vdGlmaWNhdGlvbi5kYXRhPy51cmwpIHtcbiAgICBldmVudC53YWl0VW50aWwoXG4gICAgICBzd1NlbGYuY2xpZW50c1xuICAgICAgICAubWF0Y2hBbGwoeyB0eXBlOiBcIndpbmRvd1wiLCBpbmNsdWRlVW5jb250cm9sbGVkOiB0cnVlIH0pXG4gICAgICAgIC50aGVuKChjbGllbnRMaXN0OiBhbnkpID0+IHtcbiAgICAgICAgICBmb3IgKGNvbnN0IGNsaWVudCBvZiBjbGllbnRMaXN0KSB7XG4gICAgICAgICAgICBpZiAoY2xpZW50LnVybCA9PT0gZXZlbnQubm90aWZpY2F0aW9uLmRhdGEudXJsICYmIFwiZm9jdXNcIiBpbiBjbGllbnQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGNsaWVudC5mb2N1cygpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzd1NlbGYuY2xpZW50cy5vcGVuV2luZG93KSB7XG4gICAgICAgICAgICByZXR1cm4gc3dTZWxmLmNsaWVudHMub3BlbldpbmRvdyhldmVudC5ub3RpZmljYXRpb24uZGF0YS51cmwpXG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIClcbiAgfVxufSlcblxuIl0sIm5hbWVzIjpbInN3U2VsZiIsInNlbGYiLCJhZGRFdmVudExpc3RlbmVyIiwiZXZlbnQiLCJkYXRhIiwianNvbiIsIm9wdGlvbnMiLCJib2R5IiwiaWNvbiIsImJhZGdlIiwidmlicmF0ZSIsInVybCIsIndhaXRVbnRpbCIsInJlZ2lzdHJhdGlvbiIsInNob3dOb3RpZmljYXRpb24iLCJ0aXRsZSIsImUiLCJ0ZXh0Iiwibm90aWZpY2F0aW9uIiwiY2xvc2UiLCJjbGllbnRzIiwibWF0Y2hBbGwiLCJ0eXBlIiwiaW5jbHVkZVVuY29udHJvbGxlZCIsInRoZW4iLCJjbGllbnRMaXN0IiwiY2xpZW50IiwiZm9jdXMiLCJvcGVuV2luZG93Il0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///./worker/index.ts\n"));

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			if (cachedModule.error !== undefined) throw cachedModule.error;
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/trusted types policy */
/******/ 	(() => {
/******/ 		var policy;
/******/ 		__webpack_require__.tt = () => {
/******/ 			// Create Trusted Type policy if Trusted Types are available and the policy doesn't exist yet.
/******/ 			if (policy === undefined) {
/******/ 				policy = {
/******/ 					createScript: (script) => (script)
/******/ 				};
/******/ 				if (typeof trustedTypes !== "undefined" && trustedTypes.createPolicy) {
/******/ 					policy = trustedTypes.createPolicy("nextjs#bundler", policy);
/******/ 				}
/******/ 			}
/******/ 			return policy;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/trusted types script */
/******/ 	(() => {
/******/ 		__webpack_require__.ts = (script) => (__webpack_require__.tt().createScript(script));
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/react refresh */
/******/ 	(() => {
/******/ 		if (__webpack_require__.i) {
/******/ 		__webpack_require__.i.push((options) => {
/******/ 			const originalFactory = options.factory;
/******/ 			options.factory = (moduleObject, moduleExports, webpackRequire) => {
/******/ 				if (!originalFactory) {
/******/ 					document.location.reload();
/******/ 					return;
/******/ 				}
/******/ 				const hasRefresh = typeof self !== "undefined" && !!self.$RefreshInterceptModuleExecution$;
/******/ 				const cleanup = hasRefresh ? self.$RefreshInterceptModuleExecution$(moduleObject.id) : () => {};
/******/ 				try {
/******/ 					originalFactory.call(this, moduleObject, moduleExports, webpackRequire);
/******/ 				} finally {
/******/ 					cleanup();
/******/ 				}
/******/ 			}
/******/ 		})
/******/ 		}
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	
/******/ 	// noop fns to prevent runtime errors during initialization
/******/ 	if (typeof self !== "undefined") {
/******/ 		self.$RefreshReg$ = function () {};
/******/ 		self.$RefreshSig$ = function () {
/******/ 			return function (type) {
/******/ 				return type;
/******/ 			};
/******/ 		};
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval-source-map devtool is used.
/******/ 	var __webpack_exports__ = __webpack_require__("./worker/index.ts");
/******/ 	
/******/ })()
;