"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var express_1 = __importDefault(require("express"));
var axios_1 = __importDefault(require("axios"));
var child_process_1 = require("child_process");
var fs_1 = __importDefault(require("fs"));
var prodaction = true;
var configDev = {
    protocol: "http://",
    ip: "localhost",
    port: "8081",
    soxPath: __dirname + "/bin/sox.exe"
};
var configProdaction = {
    protocol: "http://",
    ip: "212.77.128.177",
    port: "8081",
    soxPath: "sox"
};
var config = prodaction ? configProdaction : configDev;
var Api = /** @class */ (function () {
    function Api() {
        var _this = this;
        this.cachedTextStore = {};
        this.clearCacheServise();
        var app = express_1["default"]();
        app.use(express_1["default"].json());
        app.use("/files", express_1["default"].static(__dirname + "/files"));
        app.post("/getSpeech", function (req, res) {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            if (typeof _this.cachedTextStore[req.body.text] !== "undefined") {
                res.send(JSON.stringify({
                    url: "" + config.protocol + config.ip + ":" + config.port + "/files/" +
                        _this.cachedTextStore[req.body.text].fileName
                }));
                return;
            }
            var textChunks = _this.split(req.body.text);
            var fileName = _this.createSpeechFile(textChunks, function () {
                res.send(JSON.stringify({
                    url: "" + config.protocol + config.ip + ":" + config.port + "/files/" + fileName
                }));
                _this.cachedTextStore[req.body.text] = {
                    fileName: fileName,
                    time: Date.now()
                };
            });
        });
        app.listen(8081);
        console.log("speechKit started on port 8081");
    }
    /**
     * Делит текст по разделителям: (. ! , ?)
     * с сохранением их в тексте
     */
    Api.prototype.split = function (text) {
        return text
            .replace(/[\.!,?]/g, function (t) {
            return t + "|";
        })
            .split("|");
    };
    Api.prototype.createSpeechFile = function (textChunks, cb) {
        var id = Math.random()
            .toString()
            .substring(2);
        var fileName = "speechFile_" + id + "time_" + +Date.now() + ".wav";
        var i = 0;
        var idList = textChunks.map(function () {
            i++;
            return ("./files/id_" + id + "_time_" + +Date.now() + "_chunk_" + i + ".wav");
        });
        var idListCopy = JSON.parse(JSON.stringify(idList));
        this.itararionLoadingChunk(textChunks, idList, function () {
            child_process_1.exec(config.soxPath + " " + idListCopy.join(" ") + " " + ("./files/" + fileName), function (err, stdout, stderr) {
                if (err) {
                    console.error(err);
                    return;
                }
                cb();
            });
            setTimeout(function () {
                idListCopy.forEach(function (item) {
                    fs_1["default"].unlink(item, function () { });
                });
            }, 30000);
        });
        return fileName;
    };
    Api.prototype.loadChunk = function (text, fileName, cb) {
        axios_1["default"]
            .get("https://tts.voicetech.yandex.net/generate?" +
            "key=22fe10e2-aa2f-4a58-a934-54f2c1c4d908&" +
            "fornat=wav&" +
            "lang=ru-RU&" +
            "emotion=good&" +
            "speaker=alyss&" +
            "robot=1", {
            responseType: "arraybuffer",
            params: {
                text: text
            }
        })
            .then(function (result) {
            fs_1["default"].writeFile(fileName, result.data, function () {
                if (typeof cb !== "undefined") {
                    cb(result.data);
                }
            });
        });
    };
    Api.prototype.itararionLoadingChunk = function (textChunks, idList, cb) {
        var _this = this;
        var text = textChunks.shift();
        var id = idList.shift();
        if (typeof text !== "undefined" && typeof id !== "undefined") {
            this.loadChunk(text, id, function () {
                _this.itararionLoadingChunk(textChunks, idList, cb);
            });
        }
        else {
            cb();
        }
    };
    Api.prototype.clearCacheServise = function () {
        var _this = this;
        for (var key in this.cachedTextStore) {
            this.cachedTextStore[key].fileName;
            fs_1["default"].unlink(__dirname + "/files/" + this.cachedTextStore[key].fileName, function (e) {
                console.log(e);
            });
            delete this.cachedTextStore[key];
        }
        setTimeout(function () {
            _this.clearCacheServise();
        }, 604800000);
    };
    return Api;
}());
new Api();
