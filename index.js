"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var express_1 = __importDefault(require("express"));
var axios_1 = __importDefault(require("axios"));
var fs = require("fs");
var Api = /** @class */ (function () {
    function Api() {
        var _this = this;
        var app = express_1["default"]();
        app.use(express_1["default"].json());
        app.use("/files", express_1["default"].static(__dirname + "/files"));
        app.post("/getSpeech", function (req, res) {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            console.log(JSON.stringify(req.body));
            var textChunks = _this.split(req.body.text);
            var fileName = _this.createPlayList(textChunks, function () {
                res.send(JSON.stringify({
                    url: "http://212.77.128.177/karakulov/speechKit/files/" + fileName
                }));
            });
        });
        app.listen(8081);
        console.log("speechKit started on port 8081");
    }
    Api.prototype.split = function (text) {
        var words = text.split(" ");
        var index = 0;
        var wordsGrout = words.reduce(function (acum, word) {
            if (typeof acum[index] !== "undefined") {
                if (acum[index].length > 15) {
                    index++;
                }
            }
            if (typeof acum[index] !== "undefined") {
                acum[index].push(word);
            }
            else {
                acum[index] = [word];
            }
            return acum;
        }, []);
        return wordsGrout.map(function (item) {
            return item.join(" ");
        });
    };
    Api.prototype.createPlayList = function (textChunks, cb) {
        var fileName = "playListId" +
            Math.random()
                .toString()
                .substring(2) +
            "time_" +
            +Date.now() +
            ".m3u8";
        var idList = textChunks.map(function () {
            return ("id" +
                Math.random()
                    .toString()
                    .substring(2) +
                "time_" +
                +Date.now() +
                ".wav");
        });
        var fileContent = "#EXTM3U";
        idList.forEach(function (id) {
            fileContent +=
                "\n#EXTINF:-1,chunk" +
                    "\n" +
                    "http://212.77.128.177/karakulov/speechKit/files/" +
                    id;
        });
        fs.writeFile("./files/" + fileName, fileContent, "utf8", function () { });
        this.loadChunk(textChunks.shift(), idList.shift(), function () {
            cb();
        });
        this.itararionLoadingChunk(textChunks, idList);
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
            fs.writeFile("./files/" + fileName, result.data, function () {
                if (typeof cb !== "undefined") {
                    cb(result.data);
                }
            });
        });
    };
    Api.prototype.itararionLoadingChunk = function (textChunks, idList) {
        var _this = this;
        var text = textChunks.shift();
        var id = idList.shift();
        if (typeof text !== "undefined" && typeof id !== "undefined") {
            this.loadChunk(text, id, function () {
                _this.itararionLoadingChunk(textChunks, idList);
            });
        }
    };
    return Api;
}());
new Api();
