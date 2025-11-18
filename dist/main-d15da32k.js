import {
  require_lib
} from "./main-zqznhazw.js";
import {
  require_exec
} from "./main-c7r720rd.js";
import {
  __commonJS,
  __require
} from "./main-ynsbc1hx.js";

// node_modules/@actions/core/lib/utils.js
var require_utils = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: !0 });
  exports.toCommandProperties = exports.toCommandValue = void 0;
  function toCommandValue(input) {
    if (input === null || input === void 0)
      return "";
    else if (typeof input === "string" || input instanceof String)
      return input;
    return JSON.stringify(input);
  }
  exports.toCommandValue = toCommandValue;
  function toCommandProperties(annotationProperties) {
    if (!Object.keys(annotationProperties).length)
      return {};
    return {
      title: annotationProperties.title,
      file: annotationProperties.file,
      line: annotationProperties.startLine,
      endLine: annotationProperties.endLine,
      col: annotationProperties.startColumn,
      endColumn: annotationProperties.endColumn
    };
  }
  exports.toCommandProperties = toCommandProperties;
});

// node_modules/@actions/core/lib/command.js
var require_command = __commonJS((exports) => {
  var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === void 0)
      k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable))
      desc = { enumerable: !0, get: function() {
        return m[k];
      } };
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === void 0)
      k2 = k;
    o[k2] = m[k];
  }), __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? function(o, v) {
    Object.defineProperty(o, "default", { enumerable: !0, value: v });
  } : function(o, v) {
    o.default = v;
  }), __importStar = exports && exports.__importStar || function(mod) {
    if (mod && mod.__esModule)
      return mod;
    var result = {};
    if (mod != null) {
      for (var k in mod)
        if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    }
    return __setModuleDefault(result, mod), result;
  };
  Object.defineProperty(exports, "__esModule", { value: !0 });
  exports.issue = exports.issueCommand = void 0;
  var os = __importStar(__require("os")), utils_1 = require_utils();
  function issueCommand(command, properties, message) {
    let cmd = new Command(command, properties, message);
    process.stdout.write(cmd.toString() + os.EOL);
  }
  exports.issueCommand = issueCommand;
  function issue(name, message = "") {
    issueCommand(name, {}, message);
  }
  exports.issue = issue;
  var CMD_STRING = "::";

  class Command {
    constructor(command, properties, message) {
      if (!command)
        command = "missing.command";
      this.command = command, this.properties = properties, this.message = message;
    }
    toString() {
      let cmdStr = CMD_STRING + this.command;
      if (this.properties && Object.keys(this.properties).length > 0) {
        cmdStr += " ";
        let first = !0;
        for (let key in this.properties)
          if (this.properties.hasOwnProperty(key)) {
            let val = this.properties[key];
            if (val) {
              if (first)
                first = !1;
              else
                cmdStr += ",";
              cmdStr += `${key}=${escapeProperty(val)}`;
            }
          }
      }
      return cmdStr += `${CMD_STRING}${escapeData(this.message)}`, cmdStr;
    }
  }
  function escapeData(s) {
    return (0, utils_1.toCommandValue)(s).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
  }
  function escapeProperty(s) {
    return (0, utils_1.toCommandValue)(s).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A").replace(/:/g, "%3A").replace(/,/g, "%2C");
  }
});

// node_modules/@actions/core/lib/file-command.js
var require_file_command = __commonJS((exports) => {
  var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === void 0)
      k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable))
      desc = { enumerable: !0, get: function() {
        return m[k];
      } };
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === void 0)
      k2 = k;
    o[k2] = m[k];
  }), __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? function(o, v) {
    Object.defineProperty(o, "default", { enumerable: !0, value: v });
  } : function(o, v) {
    o.default = v;
  }), __importStar = exports && exports.__importStar || function(mod) {
    if (mod && mod.__esModule)
      return mod;
    var result = {};
    if (mod != null) {
      for (var k in mod)
        if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    }
    return __setModuleDefault(result, mod), result;
  };
  Object.defineProperty(exports, "__esModule", { value: !0 });
  exports.prepareKeyValueMessage = exports.issueFileCommand = void 0;
  var crypto = __importStar(__require("crypto")), fs = __importStar(__require("fs")), os = __importStar(__require("os")), utils_1 = require_utils();
  function issueFileCommand(command, message) {
    let filePath = process.env[`GITHUB_${command}`];
    if (!filePath)
      throw Error(`Unable to find environment variable for file command ${command}`);
    if (!fs.existsSync(filePath))
      throw Error(`Missing file at path: ${filePath}`);
    fs.appendFileSync(filePath, `${(0, utils_1.toCommandValue)(message)}${os.EOL}`, {
      encoding: "utf8"
    });
  }
  exports.issueFileCommand = issueFileCommand;
  function prepareKeyValueMessage(key, value) {
    let delimiter = `ghadelimiter_${crypto.randomUUID()}`, convertedValue = (0, utils_1.toCommandValue)(value);
    if (key.includes(delimiter))
      throw Error(`Unexpected input: name should not contain the delimiter "${delimiter}"`);
    if (convertedValue.includes(delimiter))
      throw Error(`Unexpected input: value should not contain the delimiter "${delimiter}"`);
    return `${key}<<${delimiter}${os.EOL}${convertedValue}${os.EOL}${delimiter}`;
  }
  exports.prepareKeyValueMessage = prepareKeyValueMessage;
});

// node_modules/@actions/http-client/lib/auth.js
var require_auth = __commonJS((exports) => {
  var __awaiter = exports && exports.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  Object.defineProperty(exports, "__esModule", { value: !0 });
  exports.PersonalAccessTokenCredentialHandler = exports.BearerCredentialHandler = exports.BasicCredentialHandler = void 0;

  class BasicCredentialHandler {
    constructor(username, password) {
      this.username = username, this.password = password;
    }
    prepareRequest(options) {
      if (!options.headers)
        throw Error("The request has no headers");
      options.headers.Authorization = `Basic ${Buffer.from(`${this.username}:${this.password}`).toString("base64")}`;
    }
    canHandleAuthentication() {
      return !1;
    }
    handleAuthentication() {
      return __awaiter(this, void 0, void 0, function* () {
        throw Error("not implemented");
      });
    }
  }
  exports.BasicCredentialHandler = BasicCredentialHandler;

  class BearerCredentialHandler {
    constructor(token) {
      this.token = token;
    }
    prepareRequest(options) {
      if (!options.headers)
        throw Error("The request has no headers");
      options.headers.Authorization = `Bearer ${this.token}`;
    }
    canHandleAuthentication() {
      return !1;
    }
    handleAuthentication() {
      return __awaiter(this, void 0, void 0, function* () {
        throw Error("not implemented");
      });
    }
  }
  exports.BearerCredentialHandler = BearerCredentialHandler;

  class PersonalAccessTokenCredentialHandler {
    constructor(token) {
      this.token = token;
    }
    prepareRequest(options) {
      if (!options.headers)
        throw Error("The request has no headers");
      options.headers.Authorization = `Basic ${Buffer.from(`PAT:${this.token}`).toString("base64")}`;
    }
    canHandleAuthentication() {
      return !1;
    }
    handleAuthentication() {
      return __awaiter(this, void 0, void 0, function* () {
        throw Error("not implemented");
      });
    }
  }
  exports.PersonalAccessTokenCredentialHandler = PersonalAccessTokenCredentialHandler;
});

// node_modules/@actions/core/lib/oidc-utils.js
var require_oidc_utils = __commonJS((exports) => {
  var __awaiter = exports && exports.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  Object.defineProperty(exports, "__esModule", { value: !0 });
  exports.OidcClient = void 0;
  var http_client_1 = require_lib(), auth_1 = require_auth(), core_1 = require_core();

  class OidcClient {
    static createHttpClient(allowRetry = !0, maxRetry = 10) {
      let requestOptions = {
        allowRetries: allowRetry,
        maxRetries: maxRetry
      };
      return new http_client_1.HttpClient("actions/oidc-client", [new auth_1.BearerCredentialHandler(OidcClient.getRequestToken())], requestOptions);
    }
    static getRequestToken() {
      let token = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
      if (!token)
        throw Error("Unable to get ACTIONS_ID_TOKEN_REQUEST_TOKEN env variable");
      return token;
    }
    static getIDTokenUrl() {
      let runtimeUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
      if (!runtimeUrl)
        throw Error("Unable to get ACTIONS_ID_TOKEN_REQUEST_URL env variable");
      return runtimeUrl;
    }
    static getCall(id_token_url) {
      var _a;
      return __awaiter(this, void 0, void 0, function* () {
        let id_token = (_a = (yield OidcClient.createHttpClient().getJson(id_token_url).catch((error) => {
          throw Error(`Failed to get ID Token. 
 
        Error Code : ${error.statusCode}
 
        Error Message: ${error.message}`);
        })).result) === null || _a === void 0 ? void 0 : _a.value;
        if (!id_token)
          throw Error("Response json body do not have ID Token field");
        return id_token;
      });
    }
    static getIDToken(audience) {
      return __awaiter(this, void 0, void 0, function* () {
        try {
          let id_token_url = OidcClient.getIDTokenUrl();
          if (audience) {
            let encodedAudience = encodeURIComponent(audience);
            id_token_url = `${id_token_url}&audience=${encodedAudience}`;
          }
          (0, core_1.debug)(`ID token url is ${id_token_url}`);
          let id_token = yield OidcClient.getCall(id_token_url);
          return (0, core_1.setSecret)(id_token), id_token;
        } catch (error) {
          throw Error(`Error message: ${error.message}`);
        }
      });
    }
  }
  exports.OidcClient = OidcClient;
});

// node_modules/@actions/core/lib/summary.js
var require_summary = __commonJS((exports) => {
  var __awaiter = exports && exports.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  Object.defineProperty(exports, "__esModule", { value: !0 });
  exports.summary = exports.markdownSummary = exports.SUMMARY_DOCS_URL = exports.SUMMARY_ENV_VAR = void 0;
  var os_1 = __require("os"), fs_1 = __require("fs"), { access, appendFile, writeFile } = fs_1.promises;
  exports.SUMMARY_ENV_VAR = "GITHUB_STEP_SUMMARY";
  exports.SUMMARY_DOCS_URL = "https://docs.github.com/actions/using-workflows/workflow-commands-for-github-actions#adding-a-job-summary";

  class Summary {
    constructor() {
      this._buffer = "";
    }
    filePath() {
      return __awaiter(this, void 0, void 0, function* () {
        if (this._filePath)
          return this._filePath;
        let pathFromEnv = process.env[exports.SUMMARY_ENV_VAR];
        if (!pathFromEnv)
          throw Error(`Unable to find environment variable for $${exports.SUMMARY_ENV_VAR}. Check if your runtime environment supports job summaries.`);
        try {
          yield access(pathFromEnv, fs_1.constants.R_OK | fs_1.constants.W_OK);
        } catch (_a) {
          throw Error(`Unable to access summary file: '${pathFromEnv}'. Check if the file has correct read/write permissions.`);
        }
        return this._filePath = pathFromEnv, this._filePath;
      });
    }
    wrap(tag, content, attrs = {}) {
      let htmlAttrs = Object.entries(attrs).map(([key, value]) => ` ${key}="${value}"`).join("");
      if (!content)
        return `<${tag}${htmlAttrs}>`;
      return `<${tag}${htmlAttrs}>${content}</${tag}>`;
    }
    write(options) {
      return __awaiter(this, void 0, void 0, function* () {
        let overwrite = !!(options === null || options === void 0 ? void 0 : options.overwrite), filePath = yield this.filePath();
        return yield (overwrite ? writeFile : appendFile)(filePath, this._buffer, { encoding: "utf8" }), this.emptyBuffer();
      });
    }
    clear() {
      return __awaiter(this, void 0, void 0, function* () {
        return this.emptyBuffer().write({ overwrite: !0 });
      });
    }
    stringify() {
      return this._buffer;
    }
    isEmptyBuffer() {
      return this._buffer.length === 0;
    }
    emptyBuffer() {
      return this._buffer = "", this;
    }
    addRaw(text, addEOL = !1) {
      return this._buffer += text, addEOL ? this.addEOL() : this;
    }
    addEOL() {
      return this.addRaw(os_1.EOL);
    }
    addCodeBlock(code, lang) {
      let attrs = Object.assign({}, lang && { lang }), element = this.wrap("pre", this.wrap("code", code), attrs);
      return this.addRaw(element).addEOL();
    }
    addList(items, ordered = !1) {
      let tag = ordered ? "ol" : "ul", listItems = items.map((item) => this.wrap("li", item)).join(""), element = this.wrap(tag, listItems);
      return this.addRaw(element).addEOL();
    }
    addTable(rows) {
      let tableBody = rows.map((row) => {
        let cells = row.map((cell) => {
          if (typeof cell === "string")
            return this.wrap("td", cell);
          let { header, data, colspan, rowspan } = cell, tag = header ? "th" : "td", attrs = Object.assign(Object.assign({}, colspan && { colspan }), rowspan && { rowspan });
          return this.wrap(tag, data, attrs);
        }).join("");
        return this.wrap("tr", cells);
      }).join(""), element = this.wrap("table", tableBody);
      return this.addRaw(element).addEOL();
    }
    addDetails(label, content) {
      let element = this.wrap("details", this.wrap("summary", label) + content);
      return this.addRaw(element).addEOL();
    }
    addImage(src, alt, options) {
      let { width, height } = options || {}, attrs = Object.assign(Object.assign({}, width && { width }), height && { height }), element = this.wrap("img", null, Object.assign({ src, alt }, attrs));
      return this.addRaw(element).addEOL();
    }
    addHeading(text, level) {
      let tag = `h${level}`, allowedTag = ["h1", "h2", "h3", "h4", "h5", "h6"].includes(tag) ? tag : "h1", element = this.wrap(allowedTag, text);
      return this.addRaw(element).addEOL();
    }
    addSeparator() {
      let element = this.wrap("hr", null);
      return this.addRaw(element).addEOL();
    }
    addBreak() {
      let element = this.wrap("br", null);
      return this.addRaw(element).addEOL();
    }
    addQuote(text, cite) {
      let attrs = Object.assign({}, cite && { cite }), element = this.wrap("blockquote", text, attrs);
      return this.addRaw(element).addEOL();
    }
    addLink(text, href) {
      let element = this.wrap("a", text, { href });
      return this.addRaw(element).addEOL();
    }
  }
  var _summary = new Summary;
  exports.markdownSummary = _summary;
  exports.summary = _summary;
});

// node_modules/@actions/core/lib/path-utils.js
var require_path_utils = __commonJS((exports) => {
  var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === void 0)
      k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable))
      desc = { enumerable: !0, get: function() {
        return m[k];
      } };
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === void 0)
      k2 = k;
    o[k2] = m[k];
  }), __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? function(o, v) {
    Object.defineProperty(o, "default", { enumerable: !0, value: v });
  } : function(o, v) {
    o.default = v;
  }), __importStar = exports && exports.__importStar || function(mod) {
    if (mod && mod.__esModule)
      return mod;
    var result = {};
    if (mod != null) {
      for (var k in mod)
        if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    }
    return __setModuleDefault(result, mod), result;
  };
  Object.defineProperty(exports, "__esModule", { value: !0 });
  exports.toPlatformPath = exports.toWin32Path = exports.toPosixPath = void 0;
  var path = __importStar(__require("path"));
  function toPosixPath(pth) {
    return pth.replace(/[\\]/g, "/");
  }
  exports.toPosixPath = toPosixPath;
  function toWin32Path(pth) {
    return pth.replace(/[/]/g, "\\");
  }
  exports.toWin32Path = toWin32Path;
  function toPlatformPath(pth) {
    return pth.replace(/[/\\]/g, path.sep);
  }
  exports.toPlatformPath = toPlatformPath;
});

// node_modules/@actions/core/lib/platform.js
var require_platform = __commonJS((exports) => {
  var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === void 0)
      k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable))
      desc = { enumerable: !0, get: function() {
        return m[k];
      } };
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === void 0)
      k2 = k;
    o[k2] = m[k];
  }), __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? function(o, v) {
    Object.defineProperty(o, "default", { enumerable: !0, value: v });
  } : function(o, v) {
    o.default = v;
  }), __importStar = exports && exports.__importStar || function(mod) {
    if (mod && mod.__esModule)
      return mod;
    var result = {};
    if (mod != null) {
      for (var k in mod)
        if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    }
    return __setModuleDefault(result, mod), result;
  }, __awaiter = exports && exports.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  }, __importDefault = exports && exports.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports, "__esModule", { value: !0 });
  exports.getDetails = exports.isLinux = exports.isMacOS = exports.isWindows = exports.arch = exports.platform = void 0;
  var os_1 = __importDefault(__require("os")), exec = __importStar(require_exec()), getWindowsInfo = () => __awaiter(void 0, void 0, void 0, function* () {
    let { stdout: version } = yield exec.getExecOutput('powershell -command "(Get-CimInstance -ClassName Win32_OperatingSystem).Version"', void 0, {
      silent: !0
    }), { stdout: name } = yield exec.getExecOutput('powershell -command "(Get-CimInstance -ClassName Win32_OperatingSystem).Caption"', void 0, {
      silent: !0
    });
    return {
      name: name.trim(),
      version: version.trim()
    };
  }), getMacOsInfo = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    let { stdout } = yield exec.getExecOutput("sw_vers", void 0, {
      silent: !0
    }), version = (_b = (_a = stdout.match(/ProductVersion:\s*(.+)/)) === null || _a === void 0 ? void 0 : _a[1]) !== null && _b !== void 0 ? _b : "";
    return {
      name: (_d = (_c = stdout.match(/ProductName:\s*(.+)/)) === null || _c === void 0 ? void 0 : _c[1]) !== null && _d !== void 0 ? _d : "",
      version
    };
  }), getLinuxInfo = () => __awaiter(void 0, void 0, void 0, function* () {
    let { stdout } = yield exec.getExecOutput("lsb_release", ["-i", "-r", "-s"], {
      silent: !0
    }), [name, version] = stdout.trim().split(`
`);
    return {
      name,
      version
    };
  });
  exports.platform = os_1.default.platform();
  exports.arch = os_1.default.arch();
  exports.isWindows = exports.platform === "win32";
  exports.isMacOS = exports.platform === "darwin";
  exports.isLinux = exports.platform === "linux";
  function getDetails() {
    return __awaiter(this, void 0, void 0, function* () {
      return Object.assign(Object.assign({}, yield exports.isWindows ? getWindowsInfo() : exports.isMacOS ? getMacOsInfo() : getLinuxInfo()), {
        platform: exports.platform,
        arch: exports.arch,
        isWindows: exports.isWindows,
        isMacOS: exports.isMacOS,
        isLinux: exports.isLinux
      });
    });
  }
  exports.getDetails = getDetails;
});

// node_modules/@actions/core/lib/core.js
var require_core = __commonJS((exports) => {
  var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === void 0)
      k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable))
      desc = { enumerable: !0, get: function() {
        return m[k];
      } };
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === void 0)
      k2 = k;
    o[k2] = m[k];
  }), __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? function(o, v) {
    Object.defineProperty(o, "default", { enumerable: !0, value: v });
  } : function(o, v) {
    o.default = v;
  }), __importStar = exports && exports.__importStar || function(mod) {
    if (mod && mod.__esModule)
      return mod;
    var result = {};
    if (mod != null) {
      for (var k in mod)
        if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    }
    return __setModuleDefault(result, mod), result;
  }, __awaiter = exports && exports.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  Object.defineProperty(exports, "__esModule", { value: !0 });
  exports.platform = exports.toPlatformPath = exports.toWin32Path = exports.toPosixPath = exports.markdownSummary = exports.summary = exports.getIDToken = exports.getState = exports.saveState = exports.group = exports.endGroup = exports.startGroup = exports.info = exports.notice = exports.warning = exports.error = exports.debug = exports.isDebug = exports.setFailed = exports.setCommandEcho = exports.setOutput = exports.getBooleanInput = exports.getMultilineInput = exports.getInput = exports.addPath = exports.setSecret = exports.exportVariable = exports.ExitCode = void 0;
  var command_1 = require_command(), file_command_1 = require_file_command(), utils_1 = require_utils(), os = __importStar(__require("os")), path = __importStar(__require("path")), oidc_utils_1 = require_oidc_utils(), ExitCode;
  (function(ExitCode2) {
    ExitCode2[ExitCode2.Success = 0] = "Success", ExitCode2[ExitCode2.Failure = 1] = "Failure";
  })(ExitCode || (exports.ExitCode = ExitCode = {}));
  function exportVariable(name, val) {
    let convertedVal = (0, utils_1.toCommandValue)(val);
    if (process.env[name] = convertedVal, process.env.GITHUB_ENV || "")
      return (0, file_command_1.issueFileCommand)("ENV", (0, file_command_1.prepareKeyValueMessage)(name, val));
    (0, command_1.issueCommand)("set-env", { name }, convertedVal);
  }
  exports.exportVariable = exportVariable;
  function setSecret(secret) {
    (0, command_1.issueCommand)("add-mask", {}, secret);
  }
  exports.setSecret = setSecret;
  function addPath(inputPath) {
    if (process.env.GITHUB_PATH || "")
      (0, file_command_1.issueFileCommand)("PATH", inputPath);
    else
      (0, command_1.issueCommand)("add-path", {}, inputPath);
    process.env.PATH = `${inputPath}${path.delimiter}${process.env.PATH}`;
  }
  exports.addPath = addPath;
  function getInput(name, options) {
    let val = process.env[`INPUT_${name.replace(/ /g, "_").toUpperCase()}`] || "";
    if (options && options.required && !val)
      throw Error(`Input required and not supplied: ${name}`);
    if (options && options.trimWhitespace === !1)
      return val;
    return val.trim();
  }
  exports.getInput = getInput;
  function getMultilineInput(name, options) {
    let inputs = getInput(name, options).split(`
`).filter((x) => x !== "");
    if (options && options.trimWhitespace === !1)
      return inputs;
    return inputs.map((input) => input.trim());
  }
  exports.getMultilineInput = getMultilineInput;
  function getBooleanInput(name, options) {
    let trueValue = ["true", "True", "TRUE"], falseValue = ["false", "False", "FALSE"], val = getInput(name, options);
    if (trueValue.includes(val))
      return !0;
    if (falseValue.includes(val))
      return !1;
    throw TypeError(`Input does not meet YAML 1.2 "Core Schema" specification: ${name}
Support boolean input list: \`true | True | TRUE | false | False | FALSE\``);
  }
  exports.getBooleanInput = getBooleanInput;
  function setOutput(name, value) {
    if (process.env.GITHUB_OUTPUT || "")
      return (0, file_command_1.issueFileCommand)("OUTPUT", (0, file_command_1.prepareKeyValueMessage)(name, value));
    process.stdout.write(os.EOL), (0, command_1.issueCommand)("set-output", { name }, (0, utils_1.toCommandValue)(value));
  }
  exports.setOutput = setOutput;
  function setCommandEcho(enabled) {
    (0, command_1.issue)("echo", enabled ? "on" : "off");
  }
  exports.setCommandEcho = setCommandEcho;
  function setFailed(message) {
    process.exitCode = ExitCode.Failure, error(message);
  }
  exports.setFailed = setFailed;
  function isDebug() {
    return process.env.RUNNER_DEBUG === "1";
  }
  exports.isDebug = isDebug;
  function debug(message) {
    (0, command_1.issueCommand)("debug", {}, message);
  }
  exports.debug = debug;
  function error(message, properties = {}) {
    (0, command_1.issueCommand)("error", (0, utils_1.toCommandProperties)(properties), message instanceof Error ? message.toString() : message);
  }
  exports.error = error;
  function warning(message, properties = {}) {
    (0, command_1.issueCommand)("warning", (0, utils_1.toCommandProperties)(properties), message instanceof Error ? message.toString() : message);
  }
  exports.warning = warning;
  function notice(message, properties = {}) {
    (0, command_1.issueCommand)("notice", (0, utils_1.toCommandProperties)(properties), message instanceof Error ? message.toString() : message);
  }
  exports.notice = notice;
  function info(message) {
    process.stdout.write(message + os.EOL);
  }
  exports.info = info;
  function startGroup(name) {
    (0, command_1.issue)("group", name);
  }
  exports.startGroup = startGroup;
  function endGroup() {
    (0, command_1.issue)("endgroup");
  }
  exports.endGroup = endGroup;
  function group(name, fn) {
    return __awaiter(this, void 0, void 0, function* () {
      startGroup(name);
      let result;
      try {
        result = yield fn();
      } finally {
        endGroup();
      }
      return result;
    });
  }
  exports.group = group;
  function saveState(name, value) {
    if (process.env.GITHUB_STATE || "")
      return (0, file_command_1.issueFileCommand)("STATE", (0, file_command_1.prepareKeyValueMessage)(name, value));
    (0, command_1.issueCommand)("save-state", { name }, (0, utils_1.toCommandValue)(value));
  }
  exports.saveState = saveState;
  function getState(name) {
    return process.env[`STATE_${name}`] || "";
  }
  exports.getState = getState;
  function getIDToken(aud) {
    return __awaiter(this, void 0, void 0, function* () {
      return yield oidc_utils_1.OidcClient.getIDToken(aud);
    });
  }
  exports.getIDToken = getIDToken;
  var summary_1 = require_summary();
  Object.defineProperty(exports, "summary", { enumerable: !0, get: function() {
    return summary_1.summary;
  } });
  var summary_2 = require_summary();
  Object.defineProperty(exports, "markdownSummary", { enumerable: !0, get: function() {
    return summary_2.markdownSummary;
  } });
  var path_utils_1 = require_path_utils();
  Object.defineProperty(exports, "toPosixPath", { enumerable: !0, get: function() {
    return path_utils_1.toPosixPath;
  } });
  Object.defineProperty(exports, "toWin32Path", { enumerable: !0, get: function() {
    return path_utils_1.toWin32Path;
  } });
  Object.defineProperty(exports, "toPlatformPath", { enumerable: !0, get: function() {
    return path_utils_1.toPlatformPath;
  } });
  exports.platform = __importStar(require_platform());
});

export { require_auth, require_core };

//# debugId=5421F559743AA0BD64756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vbm9kZV9tb2R1bGVzL0BhY3Rpb25zL2NvcmUvbGliL3V0aWxzLmpzIiwgIi4uL25vZGVfbW9kdWxlcy9AYWN0aW9ucy9jb3JlL2xpYi9jb21tYW5kLmpzIiwgIi4uL25vZGVfbW9kdWxlcy9AYWN0aW9ucy9jb3JlL2xpYi9maWxlLWNvbW1hbmQuanMiLCAiLi4vbm9kZV9tb2R1bGVzL0BhY3Rpb25zL2h0dHAtY2xpZW50L2xpYi9hdXRoLmpzIiwgIi4uL25vZGVfbW9kdWxlcy9AYWN0aW9ucy9jb3JlL2xpYi9vaWRjLXV0aWxzLmpzIiwgIi4uL25vZGVfbW9kdWxlcy9AYWN0aW9ucy9jb3JlL2xpYi9zdW1tYXJ5LmpzIiwgIi4uL25vZGVfbW9kdWxlcy9AYWN0aW9ucy9jb3JlL2xpYi9wYXRoLXV0aWxzLmpzIiwgIi4uL25vZGVfbW9kdWxlcy9AYWN0aW9ucy9jb3JlL2xpYi9wbGF0Zm9ybS5qcyIsICIuLi9ub2RlX21vZHVsZXMvQGFjdGlvbnMvY29yZS9saWIvY29yZS5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsKICAgICJcInVzZSBzdHJpY3RcIjtcbi8vIFdlIHVzZSBhbnkgYXMgYSB2YWxpZCBpbnB1dCB0eXBlXG4vKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55ICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLnRvQ29tbWFuZFByb3BlcnRpZXMgPSBleHBvcnRzLnRvQ29tbWFuZFZhbHVlID0gdm9pZCAwO1xuLyoqXG4gKiBTYW5pdGl6ZXMgYW4gaW5wdXQgaW50byBhIHN0cmluZyBzbyBpdCBjYW4gYmUgcGFzc2VkIGludG8gaXNzdWVDb21tYW5kIHNhZmVseVxuICogQHBhcmFtIGlucHV0IGlucHV0IHRvIHNhbml0aXplIGludG8gYSBzdHJpbmdcbiAqL1xuZnVuY3Rpb24gdG9Db21tYW5kVmFsdWUoaW5wdXQpIHtcbiAgICBpZiAoaW5wdXQgPT09IG51bGwgfHwgaW5wdXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gJyc7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycgfHwgaW5wdXQgaW5zdGFuY2VvZiBTdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIGlucHV0O1xuICAgIH1cbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoaW5wdXQpO1xufVxuZXhwb3J0cy50b0NvbW1hbmRWYWx1ZSA9IHRvQ29tbWFuZFZhbHVlO1xuLyoqXG4gKlxuICogQHBhcmFtIGFubm90YXRpb25Qcm9wZXJ0aWVzXG4gKiBAcmV0dXJucyBUaGUgY29tbWFuZCBwcm9wZXJ0aWVzIHRvIHNlbmQgd2l0aCB0aGUgYWN0dWFsIGFubm90YXRpb24gY29tbWFuZFxuICogU2VlIElzc3VlQ29tbWFuZFByb3BlcnRpZXM6IGh0dHBzOi8vZ2l0aHViLmNvbS9hY3Rpb25zL3J1bm5lci9ibG9iL21haW4vc3JjL1J1bm5lci5Xb3JrZXIvQWN0aW9uQ29tbWFuZE1hbmFnZXIuY3MjTDY0NlxuICovXG5mdW5jdGlvbiB0b0NvbW1hbmRQcm9wZXJ0aWVzKGFubm90YXRpb25Qcm9wZXJ0aWVzKSB7XG4gICAgaWYgKCFPYmplY3Qua2V5cyhhbm5vdGF0aW9uUHJvcGVydGllcykubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiB7fTtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgICAgdGl0bGU6IGFubm90YXRpb25Qcm9wZXJ0aWVzLnRpdGxlLFxuICAgICAgICBmaWxlOiBhbm5vdGF0aW9uUHJvcGVydGllcy5maWxlLFxuICAgICAgICBsaW5lOiBhbm5vdGF0aW9uUHJvcGVydGllcy5zdGFydExpbmUsXG4gICAgICAgIGVuZExpbmU6IGFubm90YXRpb25Qcm9wZXJ0aWVzLmVuZExpbmUsXG4gICAgICAgIGNvbDogYW5ub3RhdGlvblByb3BlcnRpZXMuc3RhcnRDb2x1bW4sXG4gICAgICAgIGVuZENvbHVtbjogYW5ub3RhdGlvblByb3BlcnRpZXMuZW5kQ29sdW1uXG4gICAgfTtcbn1cbmV4cG9ydHMudG9Db21tYW5kUHJvcGVydGllcyA9IHRvQ29tbWFuZFByb3BlcnRpZXM7XG4vLyMgc291cmNlTWFwcGluZ1VSTD11dGlscy5qcy5tYXAiLAogICAgIlwidXNlIHN0cmljdFwiO1xudmFyIF9fY3JlYXRlQmluZGluZyA9ICh0aGlzICYmIHRoaXMuX19jcmVhdGVCaW5kaW5nKSB8fCAoT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XG4gICAgdmFyIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG0sIGspO1xuICAgIGlmICghZGVzYyB8fCAoXCJnZXRcIiBpbiBkZXNjID8gIW0uX19lc01vZHVsZSA6IGRlc2Mud3JpdGFibGUgfHwgZGVzYy5jb25maWd1cmFibGUpKSB7XG4gICAgICBkZXNjID0geyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbVtrXTsgfSB9O1xuICAgIH1cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgazIsIGRlc2MpO1xufSkgOiAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcbiAgICBpZiAoazIgPT09IHVuZGVmaW5lZCkgazIgPSBrO1xuICAgIG9bazJdID0gbVtrXTtcbn0pKTtcbnZhciBfX3NldE1vZHVsZURlZmF1bHQgPSAodGhpcyAmJiB0aGlzLl9fc2V0TW9kdWxlRGVmYXVsdCkgfHwgKE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgdikge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBcImRlZmF1bHRcIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCB2YWx1ZTogdiB9KTtcbn0pIDogZnVuY3Rpb24obywgdikge1xuICAgIG9bXCJkZWZhdWx0XCJdID0gdjtcbn0pO1xudmFyIF9faW1wb3J0U3RhciA9ICh0aGlzICYmIHRoaXMuX19pbXBvcnRTdGFyKSB8fCBmdW5jdGlvbiAobW9kKSB7XG4gICAgaWYgKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgcmV0dXJuIG1vZDtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgaWYgKG1vZCAhPSBudWxsKSBmb3IgKHZhciBrIGluIG1vZCkgaWYgKGsgIT09IFwiZGVmYXVsdFwiICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChtb2QsIGspKSBfX2NyZWF0ZUJpbmRpbmcocmVzdWx0LCBtb2QsIGspO1xuICAgIF9fc2V0TW9kdWxlRGVmYXVsdChyZXN1bHQsIG1vZCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLmlzc3VlID0gZXhwb3J0cy5pc3N1ZUNvbW1hbmQgPSB2b2lkIDA7XG5jb25zdCBvcyA9IF9faW1wb3J0U3RhcihyZXF1aXJlKFwib3NcIikpO1xuY29uc3QgdXRpbHNfMSA9IHJlcXVpcmUoXCIuL3V0aWxzXCIpO1xuLyoqXG4gKiBDb21tYW5kc1xuICpcbiAqIENvbW1hbmQgRm9ybWF0OlxuICogICA6Om5hbWUga2V5PXZhbHVlLGtleT12YWx1ZTo6bWVzc2FnZVxuICpcbiAqIEV4YW1wbGVzOlxuICogICA6Ondhcm5pbmc6OlRoaXMgaXMgdGhlIG1lc3NhZ2VcbiAqICAgOjpzZXQtZW52IG5hbWU9TVlfVkFSOjpzb21lIHZhbHVlXG4gKi9cbmZ1bmN0aW9uIGlzc3VlQ29tbWFuZChjb21tYW5kLCBwcm9wZXJ0aWVzLCBtZXNzYWdlKSB7XG4gICAgY29uc3QgY21kID0gbmV3IENvbW1hbmQoY29tbWFuZCwgcHJvcGVydGllcywgbWVzc2FnZSk7XG4gICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUoY21kLnRvU3RyaW5nKCkgKyBvcy5FT0wpO1xufVxuZXhwb3J0cy5pc3N1ZUNvbW1hbmQgPSBpc3N1ZUNvbW1hbmQ7XG5mdW5jdGlvbiBpc3N1ZShuYW1lLCBtZXNzYWdlID0gJycpIHtcbiAgICBpc3N1ZUNvbW1hbmQobmFtZSwge30sIG1lc3NhZ2UpO1xufVxuZXhwb3J0cy5pc3N1ZSA9IGlzc3VlO1xuY29uc3QgQ01EX1NUUklORyA9ICc6Oic7XG5jbGFzcyBDb21tYW5kIHtcbiAgICBjb25zdHJ1Y3Rvcihjb21tYW5kLCBwcm9wZXJ0aWVzLCBtZXNzYWdlKSB7XG4gICAgICAgIGlmICghY29tbWFuZCkge1xuICAgICAgICAgICAgY29tbWFuZCA9ICdtaXNzaW5nLmNvbW1hbmQnO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuY29tbWFuZCA9IGNvbW1hbmQ7XG4gICAgICAgIHRoaXMucHJvcGVydGllcyA9IHByb3BlcnRpZXM7XG4gICAgICAgIHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XG4gICAgfVxuICAgIHRvU3RyaW5nKCkge1xuICAgICAgICBsZXQgY21kU3RyID0gQ01EX1NUUklORyArIHRoaXMuY29tbWFuZDtcbiAgICAgICAgaWYgKHRoaXMucHJvcGVydGllcyAmJiBPYmplY3Qua2V5cyh0aGlzLnByb3BlcnRpZXMpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNtZFN0ciArPSAnICc7XG4gICAgICAgICAgICBsZXQgZmlyc3QgPSB0cnVlO1xuICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gdGhpcy5wcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMucHJvcGVydGllcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbCA9IHRoaXMucHJvcGVydGllc1trZXldO1xuICAgICAgICAgICAgICAgICAgICBpZiAodmFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmlyc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaXJzdCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY21kU3RyICs9ICcsJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNtZFN0ciArPSBgJHtrZXl9PSR7ZXNjYXBlUHJvcGVydHkodmFsKX1gO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNtZFN0ciArPSBgJHtDTURfU1RSSU5HfSR7ZXNjYXBlRGF0YSh0aGlzLm1lc3NhZ2UpfWA7XG4gICAgICAgIHJldHVybiBjbWRTdHI7XG4gICAgfVxufVxuZnVuY3Rpb24gZXNjYXBlRGF0YShzKSB7XG4gICAgcmV0dXJuICgwLCB1dGlsc18xLnRvQ29tbWFuZFZhbHVlKShzKVxuICAgICAgICAucmVwbGFjZSgvJS9nLCAnJTI1JylcbiAgICAgICAgLnJlcGxhY2UoL1xcci9nLCAnJTBEJylcbiAgICAgICAgLnJlcGxhY2UoL1xcbi9nLCAnJTBBJyk7XG59XG5mdW5jdGlvbiBlc2NhcGVQcm9wZXJ0eShzKSB7XG4gICAgcmV0dXJuICgwLCB1dGlsc18xLnRvQ29tbWFuZFZhbHVlKShzKVxuICAgICAgICAucmVwbGFjZSgvJS9nLCAnJTI1JylcbiAgICAgICAgLnJlcGxhY2UoL1xcci9nLCAnJTBEJylcbiAgICAgICAgLnJlcGxhY2UoL1xcbi9nLCAnJTBBJylcbiAgICAgICAgLnJlcGxhY2UoLzovZywgJyUzQScpXG4gICAgICAgIC5yZXBsYWNlKC8sL2csICclMkMnKTtcbn1cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWNvbW1hbmQuanMubWFwIiwKICAgICJcInVzZSBzdHJpY3RcIjtcbi8vIEZvciBpbnRlcm5hbCB1c2UsIHN1YmplY3QgdG8gY2hhbmdlLlxudmFyIF9fY3JlYXRlQmluZGluZyA9ICh0aGlzICYmIHRoaXMuX19jcmVhdGVCaW5kaW5nKSB8fCAoT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XG4gICAgdmFyIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG0sIGspO1xuICAgIGlmICghZGVzYyB8fCAoXCJnZXRcIiBpbiBkZXNjID8gIW0uX19lc01vZHVsZSA6IGRlc2Mud3JpdGFibGUgfHwgZGVzYy5jb25maWd1cmFibGUpKSB7XG4gICAgICBkZXNjID0geyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbVtrXTsgfSB9O1xuICAgIH1cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgazIsIGRlc2MpO1xufSkgOiAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcbiAgICBpZiAoazIgPT09IHVuZGVmaW5lZCkgazIgPSBrO1xuICAgIG9bazJdID0gbVtrXTtcbn0pKTtcbnZhciBfX3NldE1vZHVsZURlZmF1bHQgPSAodGhpcyAmJiB0aGlzLl9fc2V0TW9kdWxlRGVmYXVsdCkgfHwgKE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgdikge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBcImRlZmF1bHRcIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCB2YWx1ZTogdiB9KTtcbn0pIDogZnVuY3Rpb24obywgdikge1xuICAgIG9bXCJkZWZhdWx0XCJdID0gdjtcbn0pO1xudmFyIF9faW1wb3J0U3RhciA9ICh0aGlzICYmIHRoaXMuX19pbXBvcnRTdGFyKSB8fCBmdW5jdGlvbiAobW9kKSB7XG4gICAgaWYgKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgcmV0dXJuIG1vZDtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgaWYgKG1vZCAhPSBudWxsKSBmb3IgKHZhciBrIGluIG1vZCkgaWYgKGsgIT09IFwiZGVmYXVsdFwiICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChtb2QsIGspKSBfX2NyZWF0ZUJpbmRpbmcocmVzdWx0LCBtb2QsIGspO1xuICAgIF9fc2V0TW9kdWxlRGVmYXVsdChyZXN1bHQsIG1vZCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLnByZXBhcmVLZXlWYWx1ZU1lc3NhZ2UgPSBleHBvcnRzLmlzc3VlRmlsZUNvbW1hbmQgPSB2b2lkIDA7XG4vLyBXZSB1c2UgYW55IGFzIGEgdmFsaWQgaW5wdXQgdHlwZVxuLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSAqL1xuY29uc3QgY3J5cHRvID0gX19pbXBvcnRTdGFyKHJlcXVpcmUoXCJjcnlwdG9cIikpO1xuY29uc3QgZnMgPSBfX2ltcG9ydFN0YXIocmVxdWlyZShcImZzXCIpKTtcbmNvbnN0IG9zID0gX19pbXBvcnRTdGFyKHJlcXVpcmUoXCJvc1wiKSk7XG5jb25zdCB1dGlsc18xID0gcmVxdWlyZShcIi4vdXRpbHNcIik7XG5mdW5jdGlvbiBpc3N1ZUZpbGVDb21tYW5kKGNvbW1hbmQsIG1lc3NhZ2UpIHtcbiAgICBjb25zdCBmaWxlUGF0aCA9IHByb2Nlc3MuZW52W2BHSVRIVUJfJHtjb21tYW5kfWBdO1xuICAgIGlmICghZmlsZVBhdGgpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmFibGUgdG8gZmluZCBlbnZpcm9ubWVudCB2YXJpYWJsZSBmb3IgZmlsZSBjb21tYW5kICR7Y29tbWFuZH1gKTtcbiAgICB9XG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKGZpbGVQYXRoKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgZmlsZSBhdCBwYXRoOiAke2ZpbGVQYXRofWApO1xuICAgIH1cbiAgICBmcy5hcHBlbmRGaWxlU3luYyhmaWxlUGF0aCwgYCR7KDAsIHV0aWxzXzEudG9Db21tYW5kVmFsdWUpKG1lc3NhZ2UpfSR7b3MuRU9MfWAsIHtcbiAgICAgICAgZW5jb2Rpbmc6ICd1dGY4J1xuICAgIH0pO1xufVxuZXhwb3J0cy5pc3N1ZUZpbGVDb21tYW5kID0gaXNzdWVGaWxlQ29tbWFuZDtcbmZ1bmN0aW9uIHByZXBhcmVLZXlWYWx1ZU1lc3NhZ2Uoa2V5LCB2YWx1ZSkge1xuICAgIGNvbnN0IGRlbGltaXRlciA9IGBnaGFkZWxpbWl0ZXJfJHtjcnlwdG8ucmFuZG9tVVVJRCgpfWA7XG4gICAgY29uc3QgY29udmVydGVkVmFsdWUgPSAoMCwgdXRpbHNfMS50b0NvbW1hbmRWYWx1ZSkodmFsdWUpO1xuICAgIC8vIFRoZXNlIHNob3VsZCByZWFsaXN0aWNhbGx5IG5ldmVyIGhhcHBlbiwgYnV0IGp1c3QgaW4gY2FzZSBzb21lb25lIGZpbmRzIGFcbiAgICAvLyB3YXkgdG8gZXhwbG9pdCB1dWlkIGdlbmVyYXRpb24gbGV0J3Mgbm90IGFsbG93IGtleXMgb3IgdmFsdWVzIHRoYXQgY29udGFpblxuICAgIC8vIHRoZSBkZWxpbWl0ZXIuXG4gICAgaWYgKGtleS5pbmNsdWRlcyhkZWxpbWl0ZXIpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5leHBlY3RlZCBpbnB1dDogbmFtZSBzaG91bGQgbm90IGNvbnRhaW4gdGhlIGRlbGltaXRlciBcIiR7ZGVsaW1pdGVyfVwiYCk7XG4gICAgfVxuICAgIGlmIChjb252ZXJ0ZWRWYWx1ZS5pbmNsdWRlcyhkZWxpbWl0ZXIpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5leHBlY3RlZCBpbnB1dDogdmFsdWUgc2hvdWxkIG5vdCBjb250YWluIHRoZSBkZWxpbWl0ZXIgXCIke2RlbGltaXRlcn1cImApO1xuICAgIH1cbiAgICByZXR1cm4gYCR7a2V5fTw8JHtkZWxpbWl0ZXJ9JHtvcy5FT0x9JHtjb252ZXJ0ZWRWYWx1ZX0ke29zLkVPTH0ke2RlbGltaXRlcn1gO1xufVxuZXhwb3J0cy5wcmVwYXJlS2V5VmFsdWVNZXNzYWdlID0gcHJlcGFyZUtleVZhbHVlTWVzc2FnZTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWZpbGUtY29tbWFuZC5qcy5tYXAiLAogICAgIlwidXNlIHN0cmljdFwiO1xudmFyIF9fYXdhaXRlciA9ICh0aGlzICYmIHRoaXMuX19hd2FpdGVyKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XG4gICAgZnVuY3Rpb24gYWRvcHQodmFsdWUpIHsgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgUCA/IHZhbHVlIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZSh2YWx1ZSk7IH0pOyB9XG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogYWRvcHQocmVzdWx0LnZhbHVlKS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcbiAgICB9KTtcbn07XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLlBlcnNvbmFsQWNjZXNzVG9rZW5DcmVkZW50aWFsSGFuZGxlciA9IGV4cG9ydHMuQmVhcmVyQ3JlZGVudGlhbEhhbmRsZXIgPSBleHBvcnRzLkJhc2ljQ3JlZGVudGlhbEhhbmRsZXIgPSB2b2lkIDA7XG5jbGFzcyBCYXNpY0NyZWRlbnRpYWxIYW5kbGVyIHtcbiAgICBjb25zdHJ1Y3Rvcih1c2VybmFtZSwgcGFzc3dvcmQpIHtcbiAgICAgICAgdGhpcy51c2VybmFtZSA9IHVzZXJuYW1lO1xuICAgICAgICB0aGlzLnBhc3N3b3JkID0gcGFzc3dvcmQ7XG4gICAgfVxuICAgIHByZXBhcmVSZXF1ZXN0KG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKCFvcHRpb25zLmhlYWRlcnMpIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKCdUaGUgcmVxdWVzdCBoYXMgbm8gaGVhZGVycycpO1xuICAgICAgICB9XG4gICAgICAgIG9wdGlvbnMuaGVhZGVyc1snQXV0aG9yaXphdGlvbiddID0gYEJhc2ljICR7QnVmZmVyLmZyb20oYCR7dGhpcy51c2VybmFtZX06JHt0aGlzLnBhc3N3b3JkfWApLnRvU3RyaW5nKCdiYXNlNjQnKX1gO1xuICAgIH1cbiAgICAvLyBUaGlzIGhhbmRsZXIgY2Fubm90IGhhbmRsZSA0MDFcbiAgICBjYW5IYW5kbGVBdXRoZW50aWNhdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBoYW5kbGVBdXRoZW50aWNhdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignbm90IGltcGxlbWVudGVkJyk7XG4gICAgICAgIH0pO1xuICAgIH1cbn1cbmV4cG9ydHMuQmFzaWNDcmVkZW50aWFsSGFuZGxlciA9IEJhc2ljQ3JlZGVudGlhbEhhbmRsZXI7XG5jbGFzcyBCZWFyZXJDcmVkZW50aWFsSGFuZGxlciB7XG4gICAgY29uc3RydWN0b3IodG9rZW4pIHtcbiAgICAgICAgdGhpcy50b2tlbiA9IHRva2VuO1xuICAgIH1cbiAgICAvLyBjdXJyZW50bHkgaW1wbGVtZW50cyBwcmUtYXV0aG9yaXphdGlvblxuICAgIC8vIFRPRE86IHN1cHBvcnQgcHJlQXV0aCA9IGZhbHNlIHdoZXJlIGl0IGhvb2tzIG9uIDQwMVxuICAgIHByZXBhcmVSZXF1ZXN0KG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKCFvcHRpb25zLmhlYWRlcnMpIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKCdUaGUgcmVxdWVzdCBoYXMgbm8gaGVhZGVycycpO1xuICAgICAgICB9XG4gICAgICAgIG9wdGlvbnMuaGVhZGVyc1snQXV0aG9yaXphdGlvbiddID0gYEJlYXJlciAke3RoaXMudG9rZW59YDtcbiAgICB9XG4gICAgLy8gVGhpcyBoYW5kbGVyIGNhbm5vdCBoYW5kbGUgNDAxXG4gICAgY2FuSGFuZGxlQXV0aGVudGljYXRpb24oKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaGFuZGxlQXV0aGVudGljYXRpb24oKSB7XG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ25vdCBpbXBsZW1lbnRlZCcpO1xuICAgICAgICB9KTtcbiAgICB9XG59XG5leHBvcnRzLkJlYXJlckNyZWRlbnRpYWxIYW5kbGVyID0gQmVhcmVyQ3JlZGVudGlhbEhhbmRsZXI7XG5jbGFzcyBQZXJzb25hbEFjY2Vzc1Rva2VuQ3JlZGVudGlhbEhhbmRsZXIge1xuICAgIGNvbnN0cnVjdG9yKHRva2VuKSB7XG4gICAgICAgIHRoaXMudG9rZW4gPSB0b2tlbjtcbiAgICB9XG4gICAgLy8gY3VycmVudGx5IGltcGxlbWVudHMgcHJlLWF1dGhvcml6YXRpb25cbiAgICAvLyBUT0RPOiBzdXBwb3J0IHByZUF1dGggPSBmYWxzZSB3aGVyZSBpdCBob29rcyBvbiA0MDFcbiAgICBwcmVwYXJlUmVxdWVzdChvcHRpb25zKSB7XG4gICAgICAgIGlmICghb3B0aW9ucy5oZWFkZXJzKSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcignVGhlIHJlcXVlc3QgaGFzIG5vIGhlYWRlcnMnKTtcbiAgICAgICAgfVxuICAgICAgICBvcHRpb25zLmhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9IGBCYXNpYyAke0J1ZmZlci5mcm9tKGBQQVQ6JHt0aGlzLnRva2VufWApLnRvU3RyaW5nKCdiYXNlNjQnKX1gO1xuICAgIH1cbiAgICAvLyBUaGlzIGhhbmRsZXIgY2Fubm90IGhhbmRsZSA0MDFcbiAgICBjYW5IYW5kbGVBdXRoZW50aWNhdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBoYW5kbGVBdXRoZW50aWNhdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignbm90IGltcGxlbWVudGVkJyk7XG4gICAgICAgIH0pO1xuICAgIH1cbn1cbmV4cG9ydHMuUGVyc29uYWxBY2Nlc3NUb2tlbkNyZWRlbnRpYWxIYW5kbGVyID0gUGVyc29uYWxBY2Nlc3NUb2tlbkNyZWRlbnRpYWxIYW5kbGVyO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9YXV0aC5qcy5tYXAiLAogICAgIlwidXNlIHN0cmljdFwiO1xudmFyIF9fYXdhaXRlciA9ICh0aGlzICYmIHRoaXMuX19hd2FpdGVyKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XG4gICAgZnVuY3Rpb24gYWRvcHQodmFsdWUpIHsgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgUCA/IHZhbHVlIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZSh2YWx1ZSk7IH0pOyB9XG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogYWRvcHQocmVzdWx0LnZhbHVlKS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcbiAgICB9KTtcbn07XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLk9pZGNDbGllbnQgPSB2b2lkIDA7XG5jb25zdCBodHRwX2NsaWVudF8xID0gcmVxdWlyZShcIkBhY3Rpb25zL2h0dHAtY2xpZW50XCIpO1xuY29uc3QgYXV0aF8xID0gcmVxdWlyZShcIkBhY3Rpb25zL2h0dHAtY2xpZW50L2xpYi9hdXRoXCIpO1xuY29uc3QgY29yZV8xID0gcmVxdWlyZShcIi4vY29yZVwiKTtcbmNsYXNzIE9pZGNDbGllbnQge1xuICAgIHN0YXRpYyBjcmVhdGVIdHRwQ2xpZW50KGFsbG93UmV0cnkgPSB0cnVlLCBtYXhSZXRyeSA9IDEwKSB7XG4gICAgICAgIGNvbnN0IHJlcXVlc3RPcHRpb25zID0ge1xuICAgICAgICAgICAgYWxsb3dSZXRyaWVzOiBhbGxvd1JldHJ5LFxuICAgICAgICAgICAgbWF4UmV0cmllczogbWF4UmV0cnlcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIG5ldyBodHRwX2NsaWVudF8xLkh0dHBDbGllbnQoJ2FjdGlvbnMvb2lkYy1jbGllbnQnLCBbbmV3IGF1dGhfMS5CZWFyZXJDcmVkZW50aWFsSGFuZGxlcihPaWRjQ2xpZW50LmdldFJlcXVlc3RUb2tlbigpKV0sIHJlcXVlc3RPcHRpb25zKTtcbiAgICB9XG4gICAgc3RhdGljIGdldFJlcXVlc3RUb2tlbigpIHtcbiAgICAgICAgY29uc3QgdG9rZW4gPSBwcm9jZXNzLmVudlsnQUNUSU9OU19JRF9UT0tFTl9SRVFVRVNUX1RPS0VOJ107XG4gICAgICAgIGlmICghdG9rZW4pIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGdldCBBQ1RJT05TX0lEX1RPS0VOX1JFUVVFU1RfVE9LRU4gZW52IHZhcmlhYmxlJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRva2VuO1xuICAgIH1cbiAgICBzdGF0aWMgZ2V0SURUb2tlblVybCgpIHtcbiAgICAgICAgY29uc3QgcnVudGltZVVybCA9IHByb2Nlc3MuZW52WydBQ1RJT05TX0lEX1RPS0VOX1JFUVVFU1RfVVJMJ107XG4gICAgICAgIGlmICghcnVudGltZVVybCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmFibGUgdG8gZ2V0IEFDVElPTlNfSURfVE9LRU5fUkVRVUVTVF9VUkwgZW52IHZhcmlhYmxlJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJ1bnRpbWVVcmw7XG4gICAgfVxuICAgIHN0YXRpYyBnZXRDYWxsKGlkX3Rva2VuX3VybCkge1xuICAgICAgICB2YXIgX2E7XG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICBjb25zdCBodHRwY2xpZW50ID0gT2lkY0NsaWVudC5jcmVhdGVIdHRwQ2xpZW50KCk7XG4gICAgICAgICAgICBjb25zdCByZXMgPSB5aWVsZCBodHRwY2xpZW50XG4gICAgICAgICAgICAgICAgLmdldEpzb24oaWRfdG9rZW5fdXJsKVxuICAgICAgICAgICAgICAgIC5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gZ2V0IElEIFRva2VuLiBcXG4gXG4gICAgICAgIEVycm9yIENvZGUgOiAke2Vycm9yLnN0YXR1c0NvZGV9XFxuIFxuICAgICAgICBFcnJvciBNZXNzYWdlOiAke2Vycm9yLm1lc3NhZ2V9YCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnN0IGlkX3Rva2VuID0gKF9hID0gcmVzLnJlc3VsdCkgPT09IG51bGwgfHwgX2EgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9hLnZhbHVlO1xuICAgICAgICAgICAgaWYgKCFpZF90b2tlbikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignUmVzcG9uc2UganNvbiBib2R5IGRvIG5vdCBoYXZlIElEIFRva2VuIGZpZWxkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gaWRfdG9rZW47XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBzdGF0aWMgZ2V0SURUb2tlbihhdWRpZW5jZSkge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAvLyBOZXcgSUQgVG9rZW4gaXMgcmVxdWVzdGVkIGZyb20gYWN0aW9uIHNlcnZpY2VcbiAgICAgICAgICAgICAgICBsZXQgaWRfdG9rZW5fdXJsID0gT2lkY0NsaWVudC5nZXRJRFRva2VuVXJsKCk7XG4gICAgICAgICAgICAgICAgaWYgKGF1ZGllbmNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVuY29kZWRBdWRpZW5jZSA9IGVuY29kZVVSSUNvbXBvbmVudChhdWRpZW5jZSk7XG4gICAgICAgICAgICAgICAgICAgIGlkX3Rva2VuX3VybCA9IGAke2lkX3Rva2VuX3VybH0mYXVkaWVuY2U9JHtlbmNvZGVkQXVkaWVuY2V9YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKDAsIGNvcmVfMS5kZWJ1ZykoYElEIHRva2VuIHVybCBpcyAke2lkX3Rva2VuX3VybH1gKTtcbiAgICAgICAgICAgICAgICBjb25zdCBpZF90b2tlbiA9IHlpZWxkIE9pZGNDbGllbnQuZ2V0Q2FsbChpZF90b2tlbl91cmwpO1xuICAgICAgICAgICAgICAgICgwLCBjb3JlXzEuc2V0U2VjcmV0KShpZF90b2tlbik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGlkX3Rva2VuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBFcnJvciBtZXNzYWdlOiAke2Vycm9yLm1lc3NhZ2V9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn1cbmV4cG9ydHMuT2lkY0NsaWVudCA9IE9pZGNDbGllbnQ7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1vaWRjLXV0aWxzLmpzLm1hcCIsCiAgICAiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19hd2FpdGVyID0gKHRoaXMgJiYgdGhpcy5fX2F3YWl0ZXIpIHx8IGZ1bmN0aW9uICh0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcbiAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBhZG9wdChyZXN1bHQudmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xuICAgIH0pO1xufTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMuc3VtbWFyeSA9IGV4cG9ydHMubWFya2Rvd25TdW1tYXJ5ID0gZXhwb3J0cy5TVU1NQVJZX0RPQ1NfVVJMID0gZXhwb3J0cy5TVU1NQVJZX0VOVl9WQVIgPSB2b2lkIDA7XG5jb25zdCBvc18xID0gcmVxdWlyZShcIm9zXCIpO1xuY29uc3QgZnNfMSA9IHJlcXVpcmUoXCJmc1wiKTtcbmNvbnN0IHsgYWNjZXNzLCBhcHBlbmRGaWxlLCB3cml0ZUZpbGUgfSA9IGZzXzEucHJvbWlzZXM7XG5leHBvcnRzLlNVTU1BUllfRU5WX1ZBUiA9ICdHSVRIVUJfU1RFUF9TVU1NQVJZJztcbmV4cG9ydHMuU1VNTUFSWV9ET0NTX1VSTCA9ICdodHRwczovL2RvY3MuZ2l0aHViLmNvbS9hY3Rpb25zL3VzaW5nLXdvcmtmbG93cy93b3JrZmxvdy1jb21tYW5kcy1mb3ItZ2l0aHViLWFjdGlvbnMjYWRkaW5nLWEtam9iLXN1bW1hcnknO1xuY2xhc3MgU3VtbWFyeSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMuX2J1ZmZlciA9ICcnO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBGaW5kcyB0aGUgc3VtbWFyeSBmaWxlIHBhdGggZnJvbSB0aGUgZW52aXJvbm1lbnQsIHJlamVjdHMgaWYgZW52IHZhciBpcyBub3QgZm91bmQgb3IgZmlsZSBkb2VzIG5vdCBleGlzdFxuICAgICAqIEFsc28gY2hlY2tzIHIvdyBwZXJtaXNzaW9ucy5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHN0ZXAgc3VtbWFyeSBmaWxlIHBhdGhcbiAgICAgKi9cbiAgICBmaWxlUGF0aCgpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9maWxlUGF0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9maWxlUGF0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHBhdGhGcm9tRW52ID0gcHJvY2Vzcy5lbnZbZXhwb3J0cy5TVU1NQVJZX0VOVl9WQVJdO1xuICAgICAgICAgICAgaWYgKCFwYXRoRnJvbUVudikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5hYmxlIHRvIGZpbmQgZW52aXJvbm1lbnQgdmFyaWFibGUgZm9yICQke2V4cG9ydHMuU1VNTUFSWV9FTlZfVkFSfS4gQ2hlY2sgaWYgeW91ciBydW50aW1lIGVudmlyb25tZW50IHN1cHBvcnRzIGpvYiBzdW1tYXJpZXMuYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHlpZWxkIGFjY2VzcyhwYXRoRnJvbUVudiwgZnNfMS5jb25zdGFudHMuUl9PSyB8IGZzXzEuY29uc3RhbnRzLldfT0spO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKF9hKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmFibGUgdG8gYWNjZXNzIHN1bW1hcnkgZmlsZTogJyR7cGF0aEZyb21FbnZ9Jy4gQ2hlY2sgaWYgdGhlIGZpbGUgaGFzIGNvcnJlY3QgcmVhZC93cml0ZSBwZXJtaXNzaW9ucy5gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2ZpbGVQYXRoID0gcGF0aEZyb21FbnY7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZmlsZVBhdGg7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBXcmFwcyBjb250ZW50IGluIGFuIEhUTUwgdGFnLCBhZGRpbmcgYW55IEhUTUwgYXR0cmlidXRlc1xuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRhZyBIVE1MIHRhZyB0byB3cmFwXG4gICAgICogQHBhcmFtIHtzdHJpbmcgfCBudWxsfSBjb250ZW50IGNvbnRlbnQgd2l0aGluIHRoZSB0YWdcbiAgICAgKiBAcGFyYW0ge1thdHRyaWJ1dGU6IHN0cmluZ106IHN0cmluZ30gYXR0cnMga2V5LXZhbHVlIGxpc3Qgb2YgSFRNTCBhdHRyaWJ1dGVzIHRvIGFkZFxuICAgICAqXG4gICAgICogQHJldHVybnMge3N0cmluZ30gY29udGVudCB3cmFwcGVkIGluIEhUTUwgZWxlbWVudFxuICAgICAqL1xuICAgIHdyYXAodGFnLCBjb250ZW50LCBhdHRycyA9IHt9KSB7XG4gICAgICAgIGNvbnN0IGh0bWxBdHRycyA9IE9iamVjdC5lbnRyaWVzKGF0dHJzKVxuICAgICAgICAgICAgLm1hcCgoW2tleSwgdmFsdWVdKSA9PiBgICR7a2V5fT1cIiR7dmFsdWV9XCJgKVxuICAgICAgICAgICAgLmpvaW4oJycpO1xuICAgICAgICBpZiAoIWNvbnRlbnQpIHtcbiAgICAgICAgICAgIHJldHVybiBgPCR7dGFnfSR7aHRtbEF0dHJzfT5gO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBgPCR7dGFnfSR7aHRtbEF0dHJzfT4ke2NvbnRlbnR9PC8ke3RhZ30+YDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogV3JpdGVzIHRleHQgaW4gdGhlIGJ1ZmZlciB0byB0aGUgc3VtbWFyeSBidWZmZXIgZmlsZSBhbmQgZW1wdGllcyBidWZmZXIuIFdpbGwgYXBwZW5kIGJ5IGRlZmF1bHQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1N1bW1hcnlXcml0ZU9wdGlvbnN9IFtvcHRpb25zXSAob3B0aW9uYWwpIG9wdGlvbnMgZm9yIHdyaXRlIG9wZXJhdGlvblxuICAgICAqXG4gICAgICogQHJldHVybnMge1Byb21pc2U8U3VtbWFyeT59IHN1bW1hcnkgaW5zdGFuY2VcbiAgICAgKi9cbiAgICB3cml0ZShvcHRpb25zKSB7XG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgICAgICBjb25zdCBvdmVyd3JpdGUgPSAhIShvcHRpb25zID09PSBudWxsIHx8IG9wdGlvbnMgPT09IHZvaWQgMCA/IHZvaWQgMCA6IG9wdGlvbnMub3ZlcndyaXRlKTtcbiAgICAgICAgICAgIGNvbnN0IGZpbGVQYXRoID0geWllbGQgdGhpcy5maWxlUGF0aCgpO1xuICAgICAgICAgICAgY29uc3Qgd3JpdGVGdW5jID0gb3ZlcndyaXRlID8gd3JpdGVGaWxlIDogYXBwZW5kRmlsZTtcbiAgICAgICAgICAgIHlpZWxkIHdyaXRlRnVuYyhmaWxlUGF0aCwgdGhpcy5fYnVmZmVyLCB7IGVuY29kaW5nOiAndXRmOCcgfSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5lbXB0eUJ1ZmZlcigpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2xlYXJzIHRoZSBzdW1tYXJ5IGJ1ZmZlciBhbmQgd2lwZXMgdGhlIHN1bW1hcnkgZmlsZVxuICAgICAqXG4gICAgICogQHJldHVybnMge1N1bW1hcnl9IHN1bW1hcnkgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBjbGVhcigpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmVtcHR5QnVmZmVyKCkud3JpdGUoeyBvdmVyd3JpdGU6IHRydWUgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBjdXJyZW50IHN1bW1hcnkgYnVmZmVyIGFzIGEgc3RyaW5nXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBzdHJpbmcgb2Ygc3VtbWFyeSBidWZmZXJcbiAgICAgKi9cbiAgICBzdHJpbmdpZnkoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9idWZmZXI7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIElmIHRoZSBzdW1tYXJ5IGJ1ZmZlciBpcyBlbXB0eVxuICAgICAqXG4gICAgICogQHJldHVybnMge2Jvb2xlbn0gdHJ1ZSBpZiB0aGUgYnVmZmVyIGlzIGVtcHR5XG4gICAgICovXG4gICAgaXNFbXB0eUJ1ZmZlcigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2J1ZmZlci5sZW5ndGggPT09IDA7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFJlc2V0cyB0aGUgc3VtbWFyeSBidWZmZXIgd2l0aG91dCB3cml0aW5nIHRvIHN1bW1hcnkgZmlsZVxuICAgICAqXG4gICAgICogQHJldHVybnMge1N1bW1hcnl9IHN1bW1hcnkgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBlbXB0eUJ1ZmZlcigpIHtcbiAgICAgICAgdGhpcy5fYnVmZmVyID0gJyc7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBBZGRzIHJhdyB0ZXh0IHRvIHRoZSBzdW1tYXJ5IGJ1ZmZlclxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgY29udGVudCB0byBhZGRcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFthZGRFT0w9ZmFsc2VdIChvcHRpb25hbCkgYXBwZW5kIGFuIEVPTCB0byB0aGUgcmF3IHRleHQgKGRlZmF1bHQ6IGZhbHNlKVxuICAgICAqXG4gICAgICogQHJldHVybnMge1N1bW1hcnl9IHN1bW1hcnkgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBhZGRSYXcodGV4dCwgYWRkRU9MID0gZmFsc2UpIHtcbiAgICAgICAgdGhpcy5fYnVmZmVyICs9IHRleHQ7XG4gICAgICAgIHJldHVybiBhZGRFT0wgPyB0aGlzLmFkZEVPTCgpIDogdGhpcztcbiAgICB9XG4gICAgLyoqXG4gICAgICogQWRkcyB0aGUgb3BlcmF0aW5nIHN5c3RlbS1zcGVjaWZpYyBlbmQtb2YtbGluZSBtYXJrZXIgdG8gdGhlIGJ1ZmZlclxuICAgICAqXG4gICAgICogQHJldHVybnMge1N1bW1hcnl9IHN1bW1hcnkgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBhZGRFT0woKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFkZFJhdyhvc18xLkVPTCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFkZHMgYW4gSFRNTCBjb2RlYmxvY2sgdG8gdGhlIHN1bW1hcnkgYnVmZmVyXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29kZSBjb250ZW50IHRvIHJlbmRlciB3aXRoaW4gZmVuY2VkIGNvZGUgYmxvY2tcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbGFuZyAob3B0aW9uYWwpIGxhbmd1YWdlIHRvIHN5bnRheCBoaWdobGlnaHQgY29kZVxuICAgICAqXG4gICAgICogQHJldHVybnMge1N1bW1hcnl9IHN1bW1hcnkgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBhZGRDb2RlQmxvY2soY29kZSwgbGFuZykge1xuICAgICAgICBjb25zdCBhdHRycyA9IE9iamVjdC5hc3NpZ24oe30sIChsYW5nICYmIHsgbGFuZyB9KSk7XG4gICAgICAgIGNvbnN0IGVsZW1lbnQgPSB0aGlzLndyYXAoJ3ByZScsIHRoaXMud3JhcCgnY29kZScsIGNvZGUpLCBhdHRycyk7XG4gICAgICAgIHJldHVybiB0aGlzLmFkZFJhdyhlbGVtZW50KS5hZGRFT0woKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQWRkcyBhbiBIVE1MIGxpc3QgdG8gdGhlIHN1bW1hcnkgYnVmZmVyXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ1tdfSBpdGVtcyBsaXN0IG9mIGl0ZW1zIHRvIHJlbmRlclxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29yZGVyZWQ9ZmFsc2VdIChvcHRpb25hbCkgaWYgdGhlIHJlbmRlcmVkIGxpc3Qgc2hvdWxkIGJlIG9yZGVyZWQgb3Igbm90IChkZWZhdWx0OiBmYWxzZSlcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtTdW1tYXJ5fSBzdW1tYXJ5IGluc3RhbmNlXG4gICAgICovXG4gICAgYWRkTGlzdChpdGVtcywgb3JkZXJlZCA9IGZhbHNlKSB7XG4gICAgICAgIGNvbnN0IHRhZyA9IG9yZGVyZWQgPyAnb2wnIDogJ3VsJztcbiAgICAgICAgY29uc3QgbGlzdEl0ZW1zID0gaXRlbXMubWFwKGl0ZW0gPT4gdGhpcy53cmFwKCdsaScsIGl0ZW0pKS5qb2luKCcnKTtcbiAgICAgICAgY29uc3QgZWxlbWVudCA9IHRoaXMud3JhcCh0YWcsIGxpc3RJdGVtcyk7XG4gICAgICAgIHJldHVybiB0aGlzLmFkZFJhdyhlbGVtZW50KS5hZGRFT0woKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQWRkcyBhbiBIVE1MIHRhYmxlIHRvIHRoZSBzdW1tYXJ5IGJ1ZmZlclxuICAgICAqXG4gICAgICogQHBhcmFtIHtTdW1tYXJ5VGFibGVDZWxsW119IHJvd3MgdGFibGUgcm93c1xuICAgICAqXG4gICAgICogQHJldHVybnMge1N1bW1hcnl9IHN1bW1hcnkgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBhZGRUYWJsZShyb3dzKSB7XG4gICAgICAgIGNvbnN0IHRhYmxlQm9keSA9IHJvd3NcbiAgICAgICAgICAgIC5tYXAocm93ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNlbGxzID0gcm93XG4gICAgICAgICAgICAgICAgLm1hcChjZWxsID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGNlbGwgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLndyYXAoJ3RkJywgY2VsbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHsgaGVhZGVyLCBkYXRhLCBjb2xzcGFuLCByb3dzcGFuIH0gPSBjZWxsO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRhZyA9IGhlYWRlciA/ICd0aCcgOiAndGQnO1xuICAgICAgICAgICAgICAgIGNvbnN0IGF0dHJzID0gT2JqZWN0LmFzc2lnbihPYmplY3QuYXNzaWduKHt9LCAoY29sc3BhbiAmJiB7IGNvbHNwYW4gfSkpLCAocm93c3BhbiAmJiB7IHJvd3NwYW4gfSkpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLndyYXAodGFnLCBkYXRhLCBhdHRycyk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5qb2luKCcnKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLndyYXAoJ3RyJywgY2VsbHMpO1xuICAgICAgICB9KVxuICAgICAgICAgICAgLmpvaW4oJycpO1xuICAgICAgICBjb25zdCBlbGVtZW50ID0gdGhpcy53cmFwKCd0YWJsZScsIHRhYmxlQm9keSk7XG4gICAgICAgIHJldHVybiB0aGlzLmFkZFJhdyhlbGVtZW50KS5hZGRFT0woKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQWRkcyBhIGNvbGxhcHNhYmxlIEhUTUwgZGV0YWlscyBlbGVtZW50IHRvIHRoZSBzdW1tYXJ5IGJ1ZmZlclxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGxhYmVsIHRleHQgZm9yIHRoZSBjbG9zZWQgc3RhdGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29udGVudCBjb2xsYXBzYWJsZSBjb250ZW50XG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7U3VtbWFyeX0gc3VtbWFyeSBpbnN0YW5jZVxuICAgICAqL1xuICAgIGFkZERldGFpbHMobGFiZWwsIGNvbnRlbnQpIHtcbiAgICAgICAgY29uc3QgZWxlbWVudCA9IHRoaXMud3JhcCgnZGV0YWlscycsIHRoaXMud3JhcCgnc3VtbWFyeScsIGxhYmVsKSArIGNvbnRlbnQpO1xuICAgICAgICByZXR1cm4gdGhpcy5hZGRSYXcoZWxlbWVudCkuYWRkRU9MKCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFkZHMgYW4gSFRNTCBpbWFnZSB0YWcgdG8gdGhlIHN1bW1hcnkgYnVmZmVyXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc3JjIHBhdGggdG8gdGhlIGltYWdlIHlvdSB0byBlbWJlZFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhbHQgdGV4dCBkZXNjcmlwdGlvbiBvZiB0aGUgaW1hZ2VcbiAgICAgKiBAcGFyYW0ge1N1bW1hcnlJbWFnZU9wdGlvbnN9IG9wdGlvbnMgKG9wdGlvbmFsKSBhZGRpdGlvbiBpbWFnZSBhdHRyaWJ1dGVzXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7U3VtbWFyeX0gc3VtbWFyeSBpbnN0YW5jZVxuICAgICAqL1xuICAgIGFkZEltYWdlKHNyYywgYWx0LCBvcHRpb25zKSB7XG4gICAgICAgIGNvbnN0IHsgd2lkdGgsIGhlaWdodCB9ID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgY29uc3QgYXR0cnMgPSBPYmplY3QuYXNzaWduKE9iamVjdC5hc3NpZ24oe30sICh3aWR0aCAmJiB7IHdpZHRoIH0pKSwgKGhlaWdodCAmJiB7IGhlaWdodCB9KSk7XG4gICAgICAgIGNvbnN0IGVsZW1lbnQgPSB0aGlzLndyYXAoJ2ltZycsIG51bGwsIE9iamVjdC5hc3NpZ24oeyBzcmMsIGFsdCB9LCBhdHRycykpO1xuICAgICAgICByZXR1cm4gdGhpcy5hZGRSYXcoZWxlbWVudCkuYWRkRU9MKCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEFkZHMgYW4gSFRNTCBzZWN0aW9uIGhlYWRpbmcgZWxlbWVudFxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgaGVhZGluZyB0ZXh0XG4gICAgICogQHBhcmFtIHtudW1iZXIgfCBzdHJpbmd9IFtsZXZlbD0xXSAob3B0aW9uYWwpIHRoZSBoZWFkaW5nIGxldmVsLCBkZWZhdWx0OiAxXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7U3VtbWFyeX0gc3VtbWFyeSBpbnN0YW5jZVxuICAgICAqL1xuICAgIGFkZEhlYWRpbmcodGV4dCwgbGV2ZWwpIHtcbiAgICAgICAgY29uc3QgdGFnID0gYGgke2xldmVsfWA7XG4gICAgICAgIGNvbnN0IGFsbG93ZWRUYWcgPSBbJ2gxJywgJ2gyJywgJ2gzJywgJ2g0JywgJ2g1JywgJ2g2J10uaW5jbHVkZXModGFnKVxuICAgICAgICAgICAgPyB0YWdcbiAgICAgICAgICAgIDogJ2gxJztcbiAgICAgICAgY29uc3QgZWxlbWVudCA9IHRoaXMud3JhcChhbGxvd2VkVGFnLCB0ZXh0KTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkUmF3KGVsZW1lbnQpLmFkZEVPTCgpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBBZGRzIGFuIEhUTUwgdGhlbWF0aWMgYnJlYWsgKDxocj4pIHRvIHRoZSBzdW1tYXJ5IGJ1ZmZlclxuICAgICAqXG4gICAgICogQHJldHVybnMge1N1bW1hcnl9IHN1bW1hcnkgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBhZGRTZXBhcmF0b3IoKSB7XG4gICAgICAgIGNvbnN0IGVsZW1lbnQgPSB0aGlzLndyYXAoJ2hyJywgbnVsbCk7XG4gICAgICAgIHJldHVybiB0aGlzLmFkZFJhdyhlbGVtZW50KS5hZGRFT0woKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQWRkcyBhbiBIVE1MIGxpbmUgYnJlYWsgKDxicj4pIHRvIHRoZSBzdW1tYXJ5IGJ1ZmZlclxuICAgICAqXG4gICAgICogQHJldHVybnMge1N1bW1hcnl9IHN1bW1hcnkgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBhZGRCcmVhaygpIHtcbiAgICAgICAgY29uc3QgZWxlbWVudCA9IHRoaXMud3JhcCgnYnInLCBudWxsKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkUmF3KGVsZW1lbnQpLmFkZEVPTCgpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBBZGRzIGFuIEhUTUwgYmxvY2txdW90ZSB0byB0aGUgc3VtbWFyeSBidWZmZXJcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IHF1b3RlIHRleHRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY2l0ZSAob3B0aW9uYWwpIGNpdGF0aW9uIHVybFxuICAgICAqXG4gICAgICogQHJldHVybnMge1N1bW1hcnl9IHN1bW1hcnkgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBhZGRRdW90ZSh0ZXh0LCBjaXRlKSB7XG4gICAgICAgIGNvbnN0IGF0dHJzID0gT2JqZWN0LmFzc2lnbih7fSwgKGNpdGUgJiYgeyBjaXRlIH0pKTtcbiAgICAgICAgY29uc3QgZWxlbWVudCA9IHRoaXMud3JhcCgnYmxvY2txdW90ZScsIHRleHQsIGF0dHJzKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkUmF3KGVsZW1lbnQpLmFkZEVPTCgpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBBZGRzIGFuIEhUTUwgYW5jaG9yIHRhZyB0byB0aGUgc3VtbWFyeSBidWZmZXJcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IGxpbmsgdGV4dC9jb250ZW50XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGhyZWYgaHlwZXJsaW5rXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7U3VtbWFyeX0gc3VtbWFyeSBpbnN0YW5jZVxuICAgICAqL1xuICAgIGFkZExpbmsodGV4dCwgaHJlZikge1xuICAgICAgICBjb25zdCBlbGVtZW50ID0gdGhpcy53cmFwKCdhJywgdGV4dCwgeyBocmVmIH0pO1xuICAgICAgICByZXR1cm4gdGhpcy5hZGRSYXcoZWxlbWVudCkuYWRkRU9MKCk7XG4gICAgfVxufVxuY29uc3QgX3N1bW1hcnkgPSBuZXcgU3VtbWFyeSgpO1xuLyoqXG4gKiBAZGVwcmVjYXRlZCB1c2UgYGNvcmUuc3VtbWFyeWBcbiAqL1xuZXhwb3J0cy5tYXJrZG93blN1bW1hcnkgPSBfc3VtbWFyeTtcbmV4cG9ydHMuc3VtbWFyeSA9IF9zdW1tYXJ5O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9c3VtbWFyeS5qcy5tYXAiLAogICAgIlwidXNlIHN0cmljdFwiO1xudmFyIF9fY3JlYXRlQmluZGluZyA9ICh0aGlzICYmIHRoaXMuX19jcmVhdGVCaW5kaW5nKSB8fCAoT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XG4gICAgdmFyIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG0sIGspO1xuICAgIGlmICghZGVzYyB8fCAoXCJnZXRcIiBpbiBkZXNjID8gIW0uX19lc01vZHVsZSA6IGRlc2Mud3JpdGFibGUgfHwgZGVzYy5jb25maWd1cmFibGUpKSB7XG4gICAgICBkZXNjID0geyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbVtrXTsgfSB9O1xuICAgIH1cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgazIsIGRlc2MpO1xufSkgOiAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcbiAgICBpZiAoazIgPT09IHVuZGVmaW5lZCkgazIgPSBrO1xuICAgIG9bazJdID0gbVtrXTtcbn0pKTtcbnZhciBfX3NldE1vZHVsZURlZmF1bHQgPSAodGhpcyAmJiB0aGlzLl9fc2V0TW9kdWxlRGVmYXVsdCkgfHwgKE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgdikge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBcImRlZmF1bHRcIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCB2YWx1ZTogdiB9KTtcbn0pIDogZnVuY3Rpb24obywgdikge1xuICAgIG9bXCJkZWZhdWx0XCJdID0gdjtcbn0pO1xudmFyIF9faW1wb3J0U3RhciA9ICh0aGlzICYmIHRoaXMuX19pbXBvcnRTdGFyKSB8fCBmdW5jdGlvbiAobW9kKSB7XG4gICAgaWYgKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgcmV0dXJuIG1vZDtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgaWYgKG1vZCAhPSBudWxsKSBmb3IgKHZhciBrIGluIG1vZCkgaWYgKGsgIT09IFwiZGVmYXVsdFwiICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChtb2QsIGspKSBfX2NyZWF0ZUJpbmRpbmcocmVzdWx0LCBtb2QsIGspO1xuICAgIF9fc2V0TW9kdWxlRGVmYXVsdChyZXN1bHQsIG1vZCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLnRvUGxhdGZvcm1QYXRoID0gZXhwb3J0cy50b1dpbjMyUGF0aCA9IGV4cG9ydHMudG9Qb3NpeFBhdGggPSB2b2lkIDA7XG5jb25zdCBwYXRoID0gX19pbXBvcnRTdGFyKHJlcXVpcmUoXCJwYXRoXCIpKTtcbi8qKlxuICogdG9Qb3NpeFBhdGggY29udmVydHMgdGhlIGdpdmVuIHBhdGggdG8gdGhlIHBvc2l4IGZvcm0uIE9uIFdpbmRvd3MsIFxcXFwgd2lsbCBiZVxuICogcmVwbGFjZWQgd2l0aCAvLlxuICpcbiAqIEBwYXJhbSBwdGguIFBhdGggdG8gdHJhbnNmb3JtLlxuICogQHJldHVybiBzdHJpbmcgUG9zaXggcGF0aC5cbiAqL1xuZnVuY3Rpb24gdG9Qb3NpeFBhdGgocHRoKSB7XG4gICAgcmV0dXJuIHB0aC5yZXBsYWNlKC9bXFxcXF0vZywgJy8nKTtcbn1cbmV4cG9ydHMudG9Qb3NpeFBhdGggPSB0b1Bvc2l4UGF0aDtcbi8qKlxuICogdG9XaW4zMlBhdGggY29udmVydHMgdGhlIGdpdmVuIHBhdGggdG8gdGhlIHdpbjMyIGZvcm0uIE9uIExpbnV4LCAvIHdpbGwgYmVcbiAqIHJlcGxhY2VkIHdpdGggXFxcXC5cbiAqXG4gKiBAcGFyYW0gcHRoLiBQYXRoIHRvIHRyYW5zZm9ybS5cbiAqIEByZXR1cm4gc3RyaW5nIFdpbjMyIHBhdGguXG4gKi9cbmZ1bmN0aW9uIHRvV2luMzJQYXRoKHB0aCkge1xuICAgIHJldHVybiBwdGgucmVwbGFjZSgvWy9dL2csICdcXFxcJyk7XG59XG5leHBvcnRzLnRvV2luMzJQYXRoID0gdG9XaW4zMlBhdGg7XG4vKipcbiAqIHRvUGxhdGZvcm1QYXRoIGNvbnZlcnRzIHRoZSBnaXZlbiBwYXRoIHRvIGEgcGxhdGZvcm0tc3BlY2lmaWMgcGF0aC4gSXQgZG9lc1xuICogdGhpcyBieSByZXBsYWNpbmcgaW5zdGFuY2VzIG9mIC8gYW5kIFxcIHdpdGggdGhlIHBsYXRmb3JtLXNwZWNpZmljIHBhdGhcbiAqIHNlcGFyYXRvci5cbiAqXG4gKiBAcGFyYW0gcHRoIFRoZSBwYXRoIHRvIHBsYXRmb3JtaXplLlxuICogQHJldHVybiBzdHJpbmcgVGhlIHBsYXRmb3JtLXNwZWNpZmljIHBhdGguXG4gKi9cbmZ1bmN0aW9uIHRvUGxhdGZvcm1QYXRoKHB0aCkge1xuICAgIHJldHVybiBwdGgucmVwbGFjZSgvWy9cXFxcXS9nLCBwYXRoLnNlcCk7XG59XG5leHBvcnRzLnRvUGxhdGZvcm1QYXRoID0gdG9QbGF0Zm9ybVBhdGg7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1wYXRoLXV0aWxzLmpzLm1hcCIsCiAgICAiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19jcmVhdGVCaW5kaW5nID0gKHRoaXMgJiYgdGhpcy5fX2NyZWF0ZUJpbmRpbmcpIHx8IChPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcbiAgICB2YXIgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IobSwgayk7XG4gICAgaWYgKCFkZXNjIHx8IChcImdldFwiIGluIGRlc2MgPyAhbS5fX2VzTW9kdWxlIDogZGVzYy53cml0YWJsZSB8fCBkZXNjLmNvbmZpZ3VyYWJsZSkpIHtcbiAgICAgIGRlc2MgPSB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBtW2tdOyB9IH07XG4gICAgfVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBrMiwgZGVzYyk7XG59KSA6IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XG4gICAgb1trMl0gPSBtW2tdO1xufSkpO1xudmFyIF9fc2V0TW9kdWxlRGVmYXVsdCA9ICh0aGlzICYmIHRoaXMuX19zZXRNb2R1bGVEZWZhdWx0KSB8fCAoT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCB2KSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIFwiZGVmYXVsdFwiLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2IH0pO1xufSkgOiBmdW5jdGlvbihvLCB2KSB7XG4gICAgb1tcImRlZmF1bHRcIl0gPSB2O1xufSk7XG52YXIgX19pbXBvcnRTdGFyID0gKHRoaXMgJiYgdGhpcy5fX2ltcG9ydFN0YXIpIHx8IGZ1bmN0aW9uIChtb2QpIHtcbiAgICBpZiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSByZXR1cm4gbW9kO1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICBpZiAobW9kICE9IG51bGwpIGZvciAodmFyIGsgaW4gbW9kKSBpZiAoayAhPT0gXCJkZWZhdWx0XCIgJiYgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG1vZCwgaykpIF9fY3JlYXRlQmluZGluZyhyZXN1bHQsIG1vZCwgayk7XG4gICAgX19zZXRNb2R1bGVEZWZhdWx0KHJlc3VsdCwgbW9kKTtcbiAgICByZXR1cm4gcmVzdWx0O1xufTtcbnZhciBfX2F3YWl0ZXIgPSAodGhpcyAmJiB0aGlzLl9fYXdhaXRlcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xuICAgIGZ1bmN0aW9uIGFkb3B0KHZhbHVlKSB7IHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIFAgPyB2YWx1ZSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUodmFsdWUpOyB9KTsgfVxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XG4gICAgfSk7XG59O1xudmFyIF9faW1wb3J0RGVmYXVsdCA9ICh0aGlzICYmIHRoaXMuX19pbXBvcnREZWZhdWx0KSB8fCBmdW5jdGlvbiAobW9kKSB7XG4gICAgcmV0dXJuIChtb2QgJiYgbW9kLl9fZXNNb2R1bGUpID8gbW9kIDogeyBcImRlZmF1bHRcIjogbW9kIH07XG59O1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5nZXREZXRhaWxzID0gZXhwb3J0cy5pc0xpbnV4ID0gZXhwb3J0cy5pc01hY09TID0gZXhwb3J0cy5pc1dpbmRvd3MgPSBleHBvcnRzLmFyY2ggPSBleHBvcnRzLnBsYXRmb3JtID0gdm9pZCAwO1xuY29uc3Qgb3NfMSA9IF9faW1wb3J0RGVmYXVsdChyZXF1aXJlKFwib3NcIikpO1xuY29uc3QgZXhlYyA9IF9faW1wb3J0U3RhcihyZXF1aXJlKFwiQGFjdGlvbnMvZXhlY1wiKSk7XG5jb25zdCBnZXRXaW5kb3dzSW5mbyA9ICgpID0+IF9fYXdhaXRlcih2b2lkIDAsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgIGNvbnN0IHsgc3Rkb3V0OiB2ZXJzaW9uIH0gPSB5aWVsZCBleGVjLmdldEV4ZWNPdXRwdXQoJ3Bvd2Vyc2hlbGwgLWNvbW1hbmQgXCIoR2V0LUNpbUluc3RhbmNlIC1DbGFzc05hbWUgV2luMzJfT3BlcmF0aW5nU3lzdGVtKS5WZXJzaW9uXCInLCB1bmRlZmluZWQsIHtcbiAgICAgICAgc2lsZW50OiB0cnVlXG4gICAgfSk7XG4gICAgY29uc3QgeyBzdGRvdXQ6IG5hbWUgfSA9IHlpZWxkIGV4ZWMuZ2V0RXhlY091dHB1dCgncG93ZXJzaGVsbCAtY29tbWFuZCBcIihHZXQtQ2ltSW5zdGFuY2UgLUNsYXNzTmFtZSBXaW4zMl9PcGVyYXRpbmdTeXN0ZW0pLkNhcHRpb25cIicsIHVuZGVmaW5lZCwge1xuICAgICAgICBzaWxlbnQ6IHRydWVcbiAgICB9KTtcbiAgICByZXR1cm4ge1xuICAgICAgICBuYW1lOiBuYW1lLnRyaW0oKSxcbiAgICAgICAgdmVyc2lvbjogdmVyc2lvbi50cmltKClcbiAgICB9O1xufSk7XG5jb25zdCBnZXRNYWNPc0luZm8gPSAoKSA9PiBfX2F3YWl0ZXIodm9pZCAwLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICB2YXIgX2EsIF9iLCBfYywgX2Q7XG4gICAgY29uc3QgeyBzdGRvdXQgfSA9IHlpZWxkIGV4ZWMuZ2V0RXhlY091dHB1dCgnc3dfdmVycycsIHVuZGVmaW5lZCwge1xuICAgICAgICBzaWxlbnQ6IHRydWVcbiAgICB9KTtcbiAgICBjb25zdCB2ZXJzaW9uID0gKF9iID0gKF9hID0gc3Rkb3V0Lm1hdGNoKC9Qcm9kdWN0VmVyc2lvbjpcXHMqKC4rKS8pKSA9PT0gbnVsbCB8fCBfYSA9PT0gdm9pZCAwID8gdm9pZCAwIDogX2FbMV0pICE9PSBudWxsICYmIF9iICE9PSB2b2lkIDAgPyBfYiA6ICcnO1xuICAgIGNvbnN0IG5hbWUgPSAoX2QgPSAoX2MgPSBzdGRvdXQubWF0Y2goL1Byb2R1Y3ROYW1lOlxccyooLispLykpID09PSBudWxsIHx8IF9jID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfY1sxXSkgIT09IG51bGwgJiYgX2QgIT09IHZvaWQgMCA/IF9kIDogJyc7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZSxcbiAgICAgICAgdmVyc2lvblxuICAgIH07XG59KTtcbmNvbnN0IGdldExpbnV4SW5mbyA9ICgpID0+IF9fYXdhaXRlcih2b2lkIDAsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgIGNvbnN0IHsgc3Rkb3V0IH0gPSB5aWVsZCBleGVjLmdldEV4ZWNPdXRwdXQoJ2xzYl9yZWxlYXNlJywgWyctaScsICctcicsICctcyddLCB7XG4gICAgICAgIHNpbGVudDogdHJ1ZVxuICAgIH0pO1xuICAgIGNvbnN0IFtuYW1lLCB2ZXJzaW9uXSA9IHN0ZG91dC50cmltKCkuc3BsaXQoJ1xcbicpO1xuICAgIHJldHVybiB7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIHZlcnNpb25cbiAgICB9O1xufSk7XG5leHBvcnRzLnBsYXRmb3JtID0gb3NfMS5kZWZhdWx0LnBsYXRmb3JtKCk7XG5leHBvcnRzLmFyY2ggPSBvc18xLmRlZmF1bHQuYXJjaCgpO1xuZXhwb3J0cy5pc1dpbmRvd3MgPSBleHBvcnRzLnBsYXRmb3JtID09PSAnd2luMzInO1xuZXhwb3J0cy5pc01hY09TID0gZXhwb3J0cy5wbGF0Zm9ybSA9PT0gJ2Rhcndpbic7XG5leHBvcnRzLmlzTGludXggPSBleHBvcnRzLnBsYXRmb3JtID09PSAnbGludXgnO1xuZnVuY3Rpb24gZ2V0RGV0YWlscygpIHtcbiAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihPYmplY3QuYXNzaWduKHt9LCAoeWllbGQgKGV4cG9ydHMuaXNXaW5kb3dzXG4gICAgICAgICAgICA/IGdldFdpbmRvd3NJbmZvKClcbiAgICAgICAgICAgIDogZXhwb3J0cy5pc01hY09TXG4gICAgICAgICAgICAgICAgPyBnZXRNYWNPc0luZm8oKVxuICAgICAgICAgICAgICAgIDogZ2V0TGludXhJbmZvKCkpKSksIHsgcGxhdGZvcm06IGV4cG9ydHMucGxhdGZvcm0sXG4gICAgICAgICAgICBhcmNoOiBleHBvcnRzLmFyY2gsXG4gICAgICAgICAgICBpc1dpbmRvd3M6IGV4cG9ydHMuaXNXaW5kb3dzLFxuICAgICAgICAgICAgaXNNYWNPUzogZXhwb3J0cy5pc01hY09TLFxuICAgICAgICAgICAgaXNMaW51eDogZXhwb3J0cy5pc0xpbnV4IH0pO1xuICAgIH0pO1xufVxuZXhwb3J0cy5nZXREZXRhaWxzID0gZ2V0RGV0YWlscztcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXBsYXRmb3JtLmpzLm1hcCIsCiAgICAiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19jcmVhdGVCaW5kaW5nID0gKHRoaXMgJiYgdGhpcy5fX2NyZWF0ZUJpbmRpbmcpIHx8IChPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcbiAgICB2YXIgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IobSwgayk7XG4gICAgaWYgKCFkZXNjIHx8IChcImdldFwiIGluIGRlc2MgPyAhbS5fX2VzTW9kdWxlIDogZGVzYy53cml0YWJsZSB8fCBkZXNjLmNvbmZpZ3VyYWJsZSkpIHtcbiAgICAgIGRlc2MgPSB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBtW2tdOyB9IH07XG4gICAgfVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBrMiwgZGVzYyk7XG59KSA6IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XG4gICAgb1trMl0gPSBtW2tdO1xufSkpO1xudmFyIF9fc2V0TW9kdWxlRGVmYXVsdCA9ICh0aGlzICYmIHRoaXMuX19zZXRNb2R1bGVEZWZhdWx0KSB8fCAoT2JqZWN0LmNyZWF0ZSA/IChmdW5jdGlvbihvLCB2KSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIFwiZGVmYXVsdFwiLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2IH0pO1xufSkgOiBmdW5jdGlvbihvLCB2KSB7XG4gICAgb1tcImRlZmF1bHRcIl0gPSB2O1xufSk7XG52YXIgX19pbXBvcnRTdGFyID0gKHRoaXMgJiYgdGhpcy5fX2ltcG9ydFN0YXIpIHx8IGZ1bmN0aW9uIChtb2QpIHtcbiAgICBpZiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSByZXR1cm4gbW9kO1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICBpZiAobW9kICE9IG51bGwpIGZvciAodmFyIGsgaW4gbW9kKSBpZiAoayAhPT0gXCJkZWZhdWx0XCIgJiYgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG1vZCwgaykpIF9fY3JlYXRlQmluZGluZyhyZXN1bHQsIG1vZCwgayk7XG4gICAgX19zZXRNb2R1bGVEZWZhdWx0KHJlc3VsdCwgbW9kKTtcbiAgICByZXR1cm4gcmVzdWx0O1xufTtcbnZhciBfX2F3YWl0ZXIgPSAodGhpcyAmJiB0aGlzLl9fYXdhaXRlcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xuICAgIGZ1bmN0aW9uIGFkb3B0KHZhbHVlKSB7IHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIFAgPyB2YWx1ZSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUodmFsdWUpOyB9KTsgfVxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XG4gICAgfSk7XG59O1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5wbGF0Zm9ybSA9IGV4cG9ydHMudG9QbGF0Zm9ybVBhdGggPSBleHBvcnRzLnRvV2luMzJQYXRoID0gZXhwb3J0cy50b1Bvc2l4UGF0aCA9IGV4cG9ydHMubWFya2Rvd25TdW1tYXJ5ID0gZXhwb3J0cy5zdW1tYXJ5ID0gZXhwb3J0cy5nZXRJRFRva2VuID0gZXhwb3J0cy5nZXRTdGF0ZSA9IGV4cG9ydHMuc2F2ZVN0YXRlID0gZXhwb3J0cy5ncm91cCA9IGV4cG9ydHMuZW5kR3JvdXAgPSBleHBvcnRzLnN0YXJ0R3JvdXAgPSBleHBvcnRzLmluZm8gPSBleHBvcnRzLm5vdGljZSA9IGV4cG9ydHMud2FybmluZyA9IGV4cG9ydHMuZXJyb3IgPSBleHBvcnRzLmRlYnVnID0gZXhwb3J0cy5pc0RlYnVnID0gZXhwb3J0cy5zZXRGYWlsZWQgPSBleHBvcnRzLnNldENvbW1hbmRFY2hvID0gZXhwb3J0cy5zZXRPdXRwdXQgPSBleHBvcnRzLmdldEJvb2xlYW5JbnB1dCA9IGV4cG9ydHMuZ2V0TXVsdGlsaW5lSW5wdXQgPSBleHBvcnRzLmdldElucHV0ID0gZXhwb3J0cy5hZGRQYXRoID0gZXhwb3J0cy5zZXRTZWNyZXQgPSBleHBvcnRzLmV4cG9ydFZhcmlhYmxlID0gZXhwb3J0cy5FeGl0Q29kZSA9IHZvaWQgMDtcbmNvbnN0IGNvbW1hbmRfMSA9IHJlcXVpcmUoXCIuL2NvbW1hbmRcIik7XG5jb25zdCBmaWxlX2NvbW1hbmRfMSA9IHJlcXVpcmUoXCIuL2ZpbGUtY29tbWFuZFwiKTtcbmNvbnN0IHV0aWxzXzEgPSByZXF1aXJlKFwiLi91dGlsc1wiKTtcbmNvbnN0IG9zID0gX19pbXBvcnRTdGFyKHJlcXVpcmUoXCJvc1wiKSk7XG5jb25zdCBwYXRoID0gX19pbXBvcnRTdGFyKHJlcXVpcmUoXCJwYXRoXCIpKTtcbmNvbnN0IG9pZGNfdXRpbHNfMSA9IHJlcXVpcmUoXCIuL29pZGMtdXRpbHNcIik7XG4vKipcbiAqIFRoZSBjb2RlIHRvIGV4aXQgYW4gYWN0aW9uXG4gKi9cbnZhciBFeGl0Q29kZTtcbihmdW5jdGlvbiAoRXhpdENvZGUpIHtcbiAgICAvKipcbiAgICAgKiBBIGNvZGUgaW5kaWNhdGluZyB0aGF0IHRoZSBhY3Rpb24gd2FzIHN1Y2Nlc3NmdWxcbiAgICAgKi9cbiAgICBFeGl0Q29kZVtFeGl0Q29kZVtcIlN1Y2Nlc3NcIl0gPSAwXSA9IFwiU3VjY2Vzc1wiO1xuICAgIC8qKlxuICAgICAqIEEgY29kZSBpbmRpY2F0aW5nIHRoYXQgdGhlIGFjdGlvbiB3YXMgYSBmYWlsdXJlXG4gICAgICovXG4gICAgRXhpdENvZGVbRXhpdENvZGVbXCJGYWlsdXJlXCJdID0gMV0gPSBcIkZhaWx1cmVcIjtcbn0pKEV4aXRDb2RlIHx8IChleHBvcnRzLkV4aXRDb2RlID0gRXhpdENvZGUgPSB7fSkpO1xuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gVmFyaWFibGVzXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFNldHMgZW52IHZhcmlhYmxlIGZvciB0aGlzIGFjdGlvbiBhbmQgZnV0dXJlIGFjdGlvbnMgaW4gdGhlIGpvYlxuICogQHBhcmFtIG5hbWUgdGhlIG5hbWUgb2YgdGhlIHZhcmlhYmxlIHRvIHNldFxuICogQHBhcmFtIHZhbCB0aGUgdmFsdWUgb2YgdGhlIHZhcmlhYmxlLiBOb24tc3RyaW5nIHZhbHVlcyB3aWxsIGJlIGNvbnZlcnRlZCB0byBhIHN0cmluZyB2aWEgSlNPTi5zdHJpbmdpZnlcbiAqL1xuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbmZ1bmN0aW9uIGV4cG9ydFZhcmlhYmxlKG5hbWUsIHZhbCkge1xuICAgIGNvbnN0IGNvbnZlcnRlZFZhbCA9ICgwLCB1dGlsc18xLnRvQ29tbWFuZFZhbHVlKSh2YWwpO1xuICAgIHByb2Nlc3MuZW52W25hbWVdID0gY29udmVydGVkVmFsO1xuICAgIGNvbnN0IGZpbGVQYXRoID0gcHJvY2Vzcy5lbnZbJ0dJVEhVQl9FTlYnXSB8fCAnJztcbiAgICBpZiAoZmlsZVBhdGgpIHtcbiAgICAgICAgcmV0dXJuICgwLCBmaWxlX2NvbW1hbmRfMS5pc3N1ZUZpbGVDb21tYW5kKSgnRU5WJywgKDAsIGZpbGVfY29tbWFuZF8xLnByZXBhcmVLZXlWYWx1ZU1lc3NhZ2UpKG5hbWUsIHZhbCkpO1xuICAgIH1cbiAgICAoMCwgY29tbWFuZF8xLmlzc3VlQ29tbWFuZCkoJ3NldC1lbnYnLCB7IG5hbWUgfSwgY29udmVydGVkVmFsKTtcbn1cbmV4cG9ydHMuZXhwb3J0VmFyaWFibGUgPSBleHBvcnRWYXJpYWJsZTtcbi8qKlxuICogUmVnaXN0ZXJzIGEgc2VjcmV0IHdoaWNoIHdpbGwgZ2V0IG1hc2tlZCBmcm9tIGxvZ3NcbiAqIEBwYXJhbSBzZWNyZXQgdmFsdWUgb2YgdGhlIHNlY3JldFxuICovXG5mdW5jdGlvbiBzZXRTZWNyZXQoc2VjcmV0KSB7XG4gICAgKDAsIGNvbW1hbmRfMS5pc3N1ZUNvbW1hbmQpKCdhZGQtbWFzaycsIHt9LCBzZWNyZXQpO1xufVxuZXhwb3J0cy5zZXRTZWNyZXQgPSBzZXRTZWNyZXQ7XG4vKipcbiAqIFByZXBlbmRzIGlucHV0UGF0aCB0byB0aGUgUEFUSCAoZm9yIHRoaXMgYWN0aW9uIGFuZCBmdXR1cmUgYWN0aW9ucylcbiAqIEBwYXJhbSBpbnB1dFBhdGhcbiAqL1xuZnVuY3Rpb24gYWRkUGF0aChpbnB1dFBhdGgpIHtcbiAgICBjb25zdCBmaWxlUGF0aCA9IHByb2Nlc3MuZW52WydHSVRIVUJfUEFUSCddIHx8ICcnO1xuICAgIGlmIChmaWxlUGF0aCkge1xuICAgICAgICAoMCwgZmlsZV9jb21tYW5kXzEuaXNzdWVGaWxlQ29tbWFuZCkoJ1BBVEgnLCBpbnB1dFBhdGgpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgKDAsIGNvbW1hbmRfMS5pc3N1ZUNvbW1hbmQpKCdhZGQtcGF0aCcsIHt9LCBpbnB1dFBhdGgpO1xuICAgIH1cbiAgICBwcm9jZXNzLmVudlsnUEFUSCddID0gYCR7aW5wdXRQYXRofSR7cGF0aC5kZWxpbWl0ZXJ9JHtwcm9jZXNzLmVudlsnUEFUSCddfWA7XG59XG5leHBvcnRzLmFkZFBhdGggPSBhZGRQYXRoO1xuLyoqXG4gKiBHZXRzIHRoZSB2YWx1ZSBvZiBhbiBpbnB1dC5cbiAqIFVubGVzcyB0cmltV2hpdGVzcGFjZSBpcyBzZXQgdG8gZmFsc2UgaW4gSW5wdXRPcHRpb25zLCB0aGUgdmFsdWUgaXMgYWxzbyB0cmltbWVkLlxuICogUmV0dXJucyBhbiBlbXB0eSBzdHJpbmcgaWYgdGhlIHZhbHVlIGlzIG5vdCBkZWZpbmVkLlxuICpcbiAqIEBwYXJhbSAgICAgbmFtZSAgICAgbmFtZSBvZiB0aGUgaW5wdXQgdG8gZ2V0XG4gKiBAcGFyYW0gICAgIG9wdGlvbnMgIG9wdGlvbmFsLiBTZWUgSW5wdXRPcHRpb25zLlxuICogQHJldHVybnMgICBzdHJpbmdcbiAqL1xuZnVuY3Rpb24gZ2V0SW5wdXQobmFtZSwgb3B0aW9ucykge1xuICAgIGNvbnN0IHZhbCA9IHByb2Nlc3MuZW52W2BJTlBVVF8ke25hbWUucmVwbGFjZSgvIC9nLCAnXycpLnRvVXBwZXJDYXNlKCl9YF0gfHwgJyc7XG4gICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5yZXF1aXJlZCAmJiAhdmFsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgSW5wdXQgcmVxdWlyZWQgYW5kIG5vdCBzdXBwbGllZDogJHtuYW1lfWApO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLnRyaW1XaGl0ZXNwYWNlID09PSBmYWxzZSkge1xuICAgICAgICByZXR1cm4gdmFsO1xuICAgIH1cbiAgICByZXR1cm4gdmFsLnRyaW0oKTtcbn1cbmV4cG9ydHMuZ2V0SW5wdXQgPSBnZXRJbnB1dDtcbi8qKlxuICogR2V0cyB0aGUgdmFsdWVzIG9mIGFuIG11bHRpbGluZSBpbnB1dC4gIEVhY2ggdmFsdWUgaXMgYWxzbyB0cmltbWVkLlxuICpcbiAqIEBwYXJhbSAgICAgbmFtZSAgICAgbmFtZSBvZiB0aGUgaW5wdXQgdG8gZ2V0XG4gKiBAcGFyYW0gICAgIG9wdGlvbnMgIG9wdGlvbmFsLiBTZWUgSW5wdXRPcHRpb25zLlxuICogQHJldHVybnMgICBzdHJpbmdbXVxuICpcbiAqL1xuZnVuY3Rpb24gZ2V0TXVsdGlsaW5lSW5wdXQobmFtZSwgb3B0aW9ucykge1xuICAgIGNvbnN0IGlucHV0cyA9IGdldElucHV0KG5hbWUsIG9wdGlvbnMpXG4gICAgICAgIC5zcGxpdCgnXFxuJylcbiAgICAgICAgLmZpbHRlcih4ID0+IHggIT09ICcnKTtcbiAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLnRyaW1XaGl0ZXNwYWNlID09PSBmYWxzZSkge1xuICAgICAgICByZXR1cm4gaW5wdXRzO1xuICAgIH1cbiAgICByZXR1cm4gaW5wdXRzLm1hcChpbnB1dCA9PiBpbnB1dC50cmltKCkpO1xufVxuZXhwb3J0cy5nZXRNdWx0aWxpbmVJbnB1dCA9IGdldE11bHRpbGluZUlucHV0O1xuLyoqXG4gKiBHZXRzIHRoZSBpbnB1dCB2YWx1ZSBvZiB0aGUgYm9vbGVhbiB0eXBlIGluIHRoZSBZQU1MIDEuMiBcImNvcmUgc2NoZW1hXCIgc3BlY2lmaWNhdGlvbi5cbiAqIFN1cHBvcnQgYm9vbGVhbiBpbnB1dCBsaXN0OiBgdHJ1ZSB8IFRydWUgfCBUUlVFIHwgZmFsc2UgfCBGYWxzZSB8IEZBTFNFYCAuXG4gKiBUaGUgcmV0dXJuIHZhbHVlIGlzIGFsc28gaW4gYm9vbGVhbiB0eXBlLlxuICogcmVmOiBodHRwczovL3lhbWwub3JnL3NwZWMvMS4yL3NwZWMuaHRtbCNpZDI4MDQ5MjNcbiAqXG4gKiBAcGFyYW0gICAgIG5hbWUgICAgIG5hbWUgb2YgdGhlIGlucHV0IHRvIGdldFxuICogQHBhcmFtICAgICBvcHRpb25zICBvcHRpb25hbC4gU2VlIElucHV0T3B0aW9ucy5cbiAqIEByZXR1cm5zICAgYm9vbGVhblxuICovXG5mdW5jdGlvbiBnZXRCb29sZWFuSW5wdXQobmFtZSwgb3B0aW9ucykge1xuICAgIGNvbnN0IHRydWVWYWx1ZSA9IFsndHJ1ZScsICdUcnVlJywgJ1RSVUUnXTtcbiAgICBjb25zdCBmYWxzZVZhbHVlID0gWydmYWxzZScsICdGYWxzZScsICdGQUxTRSddO1xuICAgIGNvbnN0IHZhbCA9IGdldElucHV0KG5hbWUsIG9wdGlvbnMpO1xuICAgIGlmICh0cnVlVmFsdWUuaW5jbHVkZXModmFsKSlcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgaWYgKGZhbHNlVmFsdWUuaW5jbHVkZXModmFsKSlcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYElucHV0IGRvZXMgbm90IG1lZXQgWUFNTCAxLjIgXCJDb3JlIFNjaGVtYVwiIHNwZWNpZmljYXRpb246ICR7bmFtZX1cXG5gICtcbiAgICAgICAgYFN1cHBvcnQgYm9vbGVhbiBpbnB1dCBsaXN0OiBcXGB0cnVlIHwgVHJ1ZSB8IFRSVUUgfCBmYWxzZSB8IEZhbHNlIHwgRkFMU0VcXGBgKTtcbn1cbmV4cG9ydHMuZ2V0Qm9vbGVhbklucHV0ID0gZ2V0Qm9vbGVhbklucHV0O1xuLyoqXG4gKiBTZXRzIHRoZSB2YWx1ZSBvZiBhbiBvdXRwdXQuXG4gKlxuICogQHBhcmFtICAgICBuYW1lICAgICBuYW1lIG9mIHRoZSBvdXRwdXQgdG8gc2V0XG4gKiBAcGFyYW0gICAgIHZhbHVlICAgIHZhbHVlIHRvIHN0b3JlLiBOb24tc3RyaW5nIHZhbHVlcyB3aWxsIGJlIGNvbnZlcnRlZCB0byBhIHN0cmluZyB2aWEgSlNPTi5zdHJpbmdpZnlcbiAqL1xuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbmZ1bmN0aW9uIHNldE91dHB1dChuYW1lLCB2YWx1ZSkge1xuICAgIGNvbnN0IGZpbGVQYXRoID0gcHJvY2Vzcy5lbnZbJ0dJVEhVQl9PVVRQVVQnXSB8fCAnJztcbiAgICBpZiAoZmlsZVBhdGgpIHtcbiAgICAgICAgcmV0dXJuICgwLCBmaWxlX2NvbW1hbmRfMS5pc3N1ZUZpbGVDb21tYW5kKSgnT1VUUFVUJywgKDAsIGZpbGVfY29tbWFuZF8xLnByZXBhcmVLZXlWYWx1ZU1lc3NhZ2UpKG5hbWUsIHZhbHVlKSk7XG4gICAgfVxuICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKG9zLkVPTCk7XG4gICAgKDAsIGNvbW1hbmRfMS5pc3N1ZUNvbW1hbmQpKCdzZXQtb3V0cHV0JywgeyBuYW1lIH0sICgwLCB1dGlsc18xLnRvQ29tbWFuZFZhbHVlKSh2YWx1ZSkpO1xufVxuZXhwb3J0cy5zZXRPdXRwdXQgPSBzZXRPdXRwdXQ7XG4vKipcbiAqIEVuYWJsZXMgb3IgZGlzYWJsZXMgdGhlIGVjaG9pbmcgb2YgY29tbWFuZHMgaW50byBzdGRvdXQgZm9yIHRoZSByZXN0IG9mIHRoZSBzdGVwLlxuICogRWNob2luZyBpcyBkaXNhYmxlZCBieSBkZWZhdWx0IGlmIEFDVElPTlNfU1RFUF9ERUJVRyBpcyBub3Qgc2V0LlxuICpcbiAqL1xuZnVuY3Rpb24gc2V0Q29tbWFuZEVjaG8oZW5hYmxlZCkge1xuICAgICgwLCBjb21tYW5kXzEuaXNzdWUpKCdlY2hvJywgZW5hYmxlZCA/ICdvbicgOiAnb2ZmJyk7XG59XG5leHBvcnRzLnNldENvbW1hbmRFY2hvID0gc2V0Q29tbWFuZEVjaG87XG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBSZXN1bHRzXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vKipcbiAqIFNldHMgdGhlIGFjdGlvbiBzdGF0dXMgdG8gZmFpbGVkLlxuICogV2hlbiB0aGUgYWN0aW9uIGV4aXRzIGl0IHdpbGwgYmUgd2l0aCBhbiBleGl0IGNvZGUgb2YgMVxuICogQHBhcmFtIG1lc3NhZ2UgYWRkIGVycm9yIGlzc3VlIG1lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gc2V0RmFpbGVkKG1lc3NhZ2UpIHtcbiAgICBwcm9jZXNzLmV4aXRDb2RlID0gRXhpdENvZGUuRmFpbHVyZTtcbiAgICBlcnJvcihtZXNzYWdlKTtcbn1cbmV4cG9ydHMuc2V0RmFpbGVkID0gc2V0RmFpbGVkO1xuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gTG9nZ2luZyBDb21tYW5kc1xuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBHZXRzIHdoZXRoZXIgQWN0aW9ucyBTdGVwIERlYnVnIGlzIG9uIG9yIG5vdFxuICovXG5mdW5jdGlvbiBpc0RlYnVnKCkge1xuICAgIHJldHVybiBwcm9jZXNzLmVudlsnUlVOTkVSX0RFQlVHJ10gPT09ICcxJztcbn1cbmV4cG9ydHMuaXNEZWJ1ZyA9IGlzRGVidWc7XG4vKipcbiAqIFdyaXRlcyBkZWJ1ZyBtZXNzYWdlIHRvIHVzZXIgbG9nXG4gKiBAcGFyYW0gbWVzc2FnZSBkZWJ1ZyBtZXNzYWdlXG4gKi9cbmZ1bmN0aW9uIGRlYnVnKG1lc3NhZ2UpIHtcbiAgICAoMCwgY29tbWFuZF8xLmlzc3VlQ29tbWFuZCkoJ2RlYnVnJywge30sIG1lc3NhZ2UpO1xufVxuZXhwb3J0cy5kZWJ1ZyA9IGRlYnVnO1xuLyoqXG4gKiBBZGRzIGFuIGVycm9yIGlzc3VlXG4gKiBAcGFyYW0gbWVzc2FnZSBlcnJvciBpc3N1ZSBtZXNzYWdlLiBFcnJvcnMgd2lsbCBiZSBjb252ZXJ0ZWQgdG8gc3RyaW5nIHZpYSB0b1N0cmluZygpXG4gKiBAcGFyYW0gcHJvcGVydGllcyBvcHRpb25hbCBwcm9wZXJ0aWVzIHRvIGFkZCB0byB0aGUgYW5ub3RhdGlvbi5cbiAqL1xuZnVuY3Rpb24gZXJyb3IobWVzc2FnZSwgcHJvcGVydGllcyA9IHt9KSB7XG4gICAgKDAsIGNvbW1hbmRfMS5pc3N1ZUNvbW1hbmQpKCdlcnJvcicsICgwLCB1dGlsc18xLnRvQ29tbWFuZFByb3BlcnRpZXMpKHByb3BlcnRpZXMpLCBtZXNzYWdlIGluc3RhbmNlb2YgRXJyb3IgPyBtZXNzYWdlLnRvU3RyaW5nKCkgOiBtZXNzYWdlKTtcbn1cbmV4cG9ydHMuZXJyb3IgPSBlcnJvcjtcbi8qKlxuICogQWRkcyBhIHdhcm5pbmcgaXNzdWVcbiAqIEBwYXJhbSBtZXNzYWdlIHdhcm5pbmcgaXNzdWUgbWVzc2FnZS4gRXJyb3JzIHdpbGwgYmUgY29udmVydGVkIHRvIHN0cmluZyB2aWEgdG9TdHJpbmcoKVxuICogQHBhcmFtIHByb3BlcnRpZXMgb3B0aW9uYWwgcHJvcGVydGllcyB0byBhZGQgdG8gdGhlIGFubm90YXRpb24uXG4gKi9cbmZ1bmN0aW9uIHdhcm5pbmcobWVzc2FnZSwgcHJvcGVydGllcyA9IHt9KSB7XG4gICAgKDAsIGNvbW1hbmRfMS5pc3N1ZUNvbW1hbmQpKCd3YXJuaW5nJywgKDAsIHV0aWxzXzEudG9Db21tYW5kUHJvcGVydGllcykocHJvcGVydGllcyksIG1lc3NhZ2UgaW5zdGFuY2VvZiBFcnJvciA/IG1lc3NhZ2UudG9TdHJpbmcoKSA6IG1lc3NhZ2UpO1xufVxuZXhwb3J0cy53YXJuaW5nID0gd2FybmluZztcbi8qKlxuICogQWRkcyBhIG5vdGljZSBpc3N1ZVxuICogQHBhcmFtIG1lc3NhZ2Ugbm90aWNlIGlzc3VlIG1lc3NhZ2UuIEVycm9ycyB3aWxsIGJlIGNvbnZlcnRlZCB0byBzdHJpbmcgdmlhIHRvU3RyaW5nKClcbiAqIEBwYXJhbSBwcm9wZXJ0aWVzIG9wdGlvbmFsIHByb3BlcnRpZXMgdG8gYWRkIHRvIHRoZSBhbm5vdGF0aW9uLlxuICovXG5mdW5jdGlvbiBub3RpY2UobWVzc2FnZSwgcHJvcGVydGllcyA9IHt9KSB7XG4gICAgKDAsIGNvbW1hbmRfMS5pc3N1ZUNvbW1hbmQpKCdub3RpY2UnLCAoMCwgdXRpbHNfMS50b0NvbW1hbmRQcm9wZXJ0aWVzKShwcm9wZXJ0aWVzKSwgbWVzc2FnZSBpbnN0YW5jZW9mIEVycm9yID8gbWVzc2FnZS50b1N0cmluZygpIDogbWVzc2FnZSk7XG59XG5leHBvcnRzLm5vdGljZSA9IG5vdGljZTtcbi8qKlxuICogV3JpdGVzIGluZm8gdG8gbG9nIHdpdGggY29uc29sZS5sb2cuXG4gKiBAcGFyYW0gbWVzc2FnZSBpbmZvIG1lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gaW5mbyhtZXNzYWdlKSB7XG4gICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUobWVzc2FnZSArIG9zLkVPTCk7XG59XG5leHBvcnRzLmluZm8gPSBpbmZvO1xuLyoqXG4gKiBCZWdpbiBhbiBvdXRwdXQgZ3JvdXAuXG4gKlxuICogT3V0cHV0IHVudGlsIHRoZSBuZXh0IGBncm91cEVuZGAgd2lsbCBiZSBmb2xkYWJsZSBpbiB0aGlzIGdyb3VwXG4gKlxuICogQHBhcmFtIG5hbWUgVGhlIG5hbWUgb2YgdGhlIG91dHB1dCBncm91cFxuICovXG5mdW5jdGlvbiBzdGFydEdyb3VwKG5hbWUpIHtcbiAgICAoMCwgY29tbWFuZF8xLmlzc3VlKSgnZ3JvdXAnLCBuYW1lKTtcbn1cbmV4cG9ydHMuc3RhcnRHcm91cCA9IHN0YXJ0R3JvdXA7XG4vKipcbiAqIEVuZCBhbiBvdXRwdXQgZ3JvdXAuXG4gKi9cbmZ1bmN0aW9uIGVuZEdyb3VwKCkge1xuICAgICgwLCBjb21tYW5kXzEuaXNzdWUpKCdlbmRncm91cCcpO1xufVxuZXhwb3J0cy5lbmRHcm91cCA9IGVuZEdyb3VwO1xuLyoqXG4gKiBXcmFwIGFuIGFzeW5jaHJvbm91cyBmdW5jdGlvbiBjYWxsIGluIGEgZ3JvdXAuXG4gKlxuICogUmV0dXJucyB0aGUgc2FtZSB0eXBlIGFzIHRoZSBmdW5jdGlvbiBpdHNlbGYuXG4gKlxuICogQHBhcmFtIG5hbWUgVGhlIG5hbWUgb2YgdGhlIGdyb3VwXG4gKiBAcGFyYW0gZm4gVGhlIGZ1bmN0aW9uIHRvIHdyYXAgaW4gdGhlIGdyb3VwXG4gKi9cbmZ1bmN0aW9uIGdyb3VwKG5hbWUsIGZuKSB7XG4gICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgc3RhcnRHcm91cChuYW1lKTtcbiAgICAgICAgbGV0IHJlc3VsdDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJlc3VsdCA9IHlpZWxkIGZuKCk7XG4gICAgICAgIH1cbiAgICAgICAgZmluYWxseSB7XG4gICAgICAgICAgICBlbmRHcm91cCgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSk7XG59XG5leHBvcnRzLmdyb3VwID0gZ3JvdXA7XG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBXcmFwcGVyIGFjdGlvbiBzdGF0ZVxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyoqXG4gKiBTYXZlcyBzdGF0ZSBmb3IgY3VycmVudCBhY3Rpb24sIHRoZSBzdGF0ZSBjYW4gb25seSBiZSByZXRyaWV2ZWQgYnkgdGhpcyBhY3Rpb24ncyBwb3N0IGpvYiBleGVjdXRpb24uXG4gKlxuICogQHBhcmFtICAgICBuYW1lICAgICBuYW1lIG9mIHRoZSBzdGF0ZSB0byBzdG9yZVxuICogQHBhcmFtICAgICB2YWx1ZSAgICB2YWx1ZSB0byBzdG9yZS4gTm9uLXN0cmluZyB2YWx1ZXMgd2lsbCBiZSBjb252ZXJ0ZWQgdG8gYSBzdHJpbmcgdmlhIEpTT04uc3RyaW5naWZ5XG4gKi9cbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG5mdW5jdGlvbiBzYXZlU3RhdGUobmFtZSwgdmFsdWUpIHtcbiAgICBjb25zdCBmaWxlUGF0aCA9IHByb2Nlc3MuZW52WydHSVRIVUJfU1RBVEUnXSB8fCAnJztcbiAgICBpZiAoZmlsZVBhdGgpIHtcbiAgICAgICAgcmV0dXJuICgwLCBmaWxlX2NvbW1hbmRfMS5pc3N1ZUZpbGVDb21tYW5kKSgnU1RBVEUnLCAoMCwgZmlsZV9jb21tYW5kXzEucHJlcGFyZUtleVZhbHVlTWVzc2FnZSkobmFtZSwgdmFsdWUpKTtcbiAgICB9XG4gICAgKDAsIGNvbW1hbmRfMS5pc3N1ZUNvbW1hbmQpKCdzYXZlLXN0YXRlJywgeyBuYW1lIH0sICgwLCB1dGlsc18xLnRvQ29tbWFuZFZhbHVlKSh2YWx1ZSkpO1xufVxuZXhwb3J0cy5zYXZlU3RhdGUgPSBzYXZlU3RhdGU7XG4vKipcbiAqIEdldHMgdGhlIHZhbHVlIG9mIGFuIHN0YXRlIHNldCBieSB0aGlzIGFjdGlvbidzIG1haW4gZXhlY3V0aW9uLlxuICpcbiAqIEBwYXJhbSAgICAgbmFtZSAgICAgbmFtZSBvZiB0aGUgc3RhdGUgdG8gZ2V0XG4gKiBAcmV0dXJucyAgIHN0cmluZ1xuICovXG5mdW5jdGlvbiBnZXRTdGF0ZShuYW1lKSB7XG4gICAgcmV0dXJuIHByb2Nlc3MuZW52W2BTVEFURV8ke25hbWV9YF0gfHwgJyc7XG59XG5leHBvcnRzLmdldFN0YXRlID0gZ2V0U3RhdGU7XG5mdW5jdGlvbiBnZXRJRFRva2VuKGF1ZCkge1xuICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgIHJldHVybiB5aWVsZCBvaWRjX3V0aWxzXzEuT2lkY0NsaWVudC5nZXRJRFRva2VuKGF1ZCk7XG4gICAgfSk7XG59XG5leHBvcnRzLmdldElEVG9rZW4gPSBnZXRJRFRva2VuO1xuLyoqXG4gKiBTdW1tYXJ5IGV4cG9ydHNcbiAqL1xudmFyIHN1bW1hcnlfMSA9IHJlcXVpcmUoXCIuL3N1bW1hcnlcIik7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJzdW1tYXJ5XCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiBzdW1tYXJ5XzEuc3VtbWFyeTsgfSB9KTtcbi8qKlxuICogQGRlcHJlY2F0ZWQgdXNlIGNvcmUuc3VtbWFyeVxuICovXG52YXIgc3VtbWFyeV8yID0gcmVxdWlyZShcIi4vc3VtbWFyeVwiKTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIm1hcmtkb3duU3VtbWFyeVwiLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gc3VtbWFyeV8yLm1hcmtkb3duU3VtbWFyeTsgfSB9KTtcbi8qKlxuICogUGF0aCBleHBvcnRzXG4gKi9cbnZhciBwYXRoX3V0aWxzXzEgPSByZXF1aXJlKFwiLi9wYXRoLXV0aWxzXCIpO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwidG9Qb3NpeFBhdGhcIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHBhdGhfdXRpbHNfMS50b1Bvc2l4UGF0aDsgfSB9KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcInRvV2luMzJQYXRoXCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiBwYXRoX3V0aWxzXzEudG9XaW4zMlBhdGg7IH0gfSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJ0b1BsYXRmb3JtUGF0aFwiLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gcGF0aF91dGlsc18xLnRvUGxhdGZvcm1QYXRoOyB9IH0pO1xuLyoqXG4gKiBQbGF0Zm9ybSB1dGlsaXRpZXMgZXhwb3J0c1xuICovXG5leHBvcnRzLnBsYXRmb3JtID0gX19pbXBvcnRTdGFyKHJlcXVpcmUoXCIuL3BsYXRmb3JtXCIpKTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWNvcmUuanMubWFwIgogIF0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7OztFQUdBLE9BQU8sZUFBZSxTQUFTLGNBQWMsRUFBRSxPQUFPLEdBQUssQ0FBQztBQUFBLEVBQ3BELDhCQUE4Qix5QkFBc0I7QUFBQSxFQUs1RCxTQUFTLGNBQWMsQ0FBQyxPQUFPO0FBQUEsSUFDM0IsSUFBSSxVQUFVLFFBQVEsVUFBVTtBQUFBLE1BQzVCLE9BQU87QUFBQSxJQUVOLFNBQUksT0FBTyxVQUFVLFlBQVksaUJBQWlCO0FBQUEsTUFDbkQsT0FBTztBQUFBLElBRVgsT0FBTyxLQUFLLFVBQVUsS0FBSztBQUFBO0FBQUEsRUFFdkIseUJBQWlCO0FBQUEsRUFPekIsU0FBUyxtQkFBbUIsQ0FBQyxzQkFBc0I7QUFBQSxJQUMvQyxJQUFJLENBQUMsT0FBTyxLQUFLLG9CQUFvQixFQUFFO0FBQUEsTUFDbkMsT0FBTyxDQUFDO0FBQUEsSUFFWixPQUFPO0FBQUEsTUFDSCxPQUFPLHFC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QVE7QUFBQSxFQVdoQixTQUFTLFNBQVMsQ0FBQyxNQUFNLE9BQU87QUFBQSxJQUU1QixJQURpQixRQUFRLElBQUksZ0JBQW1CO0FBQUEsTUFFNUMsUUFBUSxHQUFHLGVBQWUsa0JBQWtCLFVBQVUsR0FBRyxlQUFlLHdCQUF3QixNQUFNLEtBQUssQ0FBQztBQUFBLEtBRS9HLEdBQUcsVUFBVSxjQUFjLGNBQWMsRUFBRSxLQUFLLElBQUksR0FBRyxRQUFRLGdCQUFnQixLQUFLLENBQUM7QUFBQTtBQUFBLEVBRTFGLFFBQVEsWUFBWTtBQUFBLEVBT3BCLFNBQVMsUUFBUSxDQUFDLE1BQU07QUFBQSxJQUNwQixPQUFPLFFBQVEsSUFBSSxTQUFTLFdBQVc7QUFBQTtBQUFBLEVBRTNDLFFBQVEsV0FBVztBQUFBLEVBQ25CLFNBQVMsVUFBVSxDQUFDLEtBQUs7QUFBQSxJQUNyQixPQUFPLFVBQVUsTUFBVyxRQUFRLFFBQUcsVUFBVSxHQUFHO0FBQUEsTUFDaEQsT0FBTyxNQUFNLGFBQWEsV0FBVyxXQUFXLEdBQUc7QUFBQSxLQUN0RDtBQUFBO0FBQUEsRUFFTCxRQUFRLGFBQWE7QUFBQSxFQUlyQixJQUFJO0FBQUEsRUFDSixPQUFPLGVBQWUsU0FBUyxXQUFXLEVBQUUsWUFBWSxJQUFNLEtBQUssUUFBUyxHQUFHO0FBQUEsSUFBRSxPQUFPLFVBQVU7QUFBQSxJQUFXLENBQUM7QUFBQSxFQUk5RyxJQUFJO0FBQUEsRUFDSixPQUFPLGVBQWUsU0FBUyxtQkFBbUIsRUFBRSxZQUFZLElBQU0sS0FBSyxRQUFTLEdBQUc7QUFBQSxJQUFFLE9BQU8sVUFBVTtBQUFBLElBQW1CLENBQUM7QUFBQSxFQUk5SCxJQUFJO0FBQUEsRUFDSixPQUFPLGVBQWUsU0FBUyxlQUFlLEVBQUUsWUFBWSxJQUFNLEtBQUssUUFBUyxHQUFHO0FBQUEsSUFBRSxPQUFPLGFBQWE7QUFBQSxJQUFlLENBQUM7QUFBQSxFQUN6SCxPQUFPLGVBQWUsU0FBUyxlQUFlLEVBQUUsWUFBWSxJQUFNLEtBQUssUUFBUyxHQUFHO0FBQUEsSUFBRSxPQUFPLGFBQWE7QUFBQSxJQUFlLENBQUM7QUFBQSxFQUN6SCxPQUFPLGVBQWUsU0FBUyxrQkFBa0IsRUFBRSxZQUFZLElBQU0sS0FBSyxRQUFTLEdBQUc7QUFBQSxJQUFFLE9BQU8sYUFBYTtBQUFBLElBQWtCLENBQUM7QUFBQSxFQUkvSCxRQUFRLFdBQVcsK0JBQWtDO0FBQUE7IiwKICAiZGVidWdJZCI6ICI1NDIxRjU1OTc0M0FBMEJENjQ3NTZFMjE2NDc1NkUyMSIsCiAgIm5hbWVzIjogW10KfQ==
