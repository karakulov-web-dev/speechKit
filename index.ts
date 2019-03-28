import express from "express";
import axios from "axios";
import { exec } from "child_process";
import fs from "fs";

interface CachedTextStore {
  [text: string]: {
    fileName: string;
    time: number;
  };
}

let prodaction = true;

const configDev = {
  protocol: "http://",
  ip: "localhost",
  port: "8081",
  soxPath: `${__dirname}/bin/sox.exe`
};
const configProdaction = {
  protocol: "http://",
  ip: "212.77.128.177",
  port: "8081",
  soxPath: "sox"
};
const config = prodaction ? configProdaction : configDev;

class Api {
  private cachedTextStore: CachedTextStore;
  constructor() {
    this.cachedTextStore = {};
    this.clearCacheServise();
    const app = express();
    app.use(express.json());
    app.use("/files", express.static(__dirname + "/files"));

    this.createApiPoint_getSpeech(app);

    app.listen(8081);
    console.log("speechKit started on port 8081");
  }

  /**
   * Делит текст по разделителям: (. ! , ?)
   * с сохранением их в тексте
   */
  private createApiPoint_getSpeech(app: express.Express) {
    app.post("/getSpeech", (req, res) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
      );

      if (typeof this.cachedTextStore[req.body.text] !== "undefined") {
        res.send(
          JSON.stringify({
            url:
              `${config.protocol}${config.ip}:${config.port}/files/` +
              this.cachedTextStore[req.body.text].fileName
          })
        );
        return;
      }

      let textChunks: string[] = this.split(req.body.text);

      let fileName = this.createSpeechFile(textChunks, (err: string) => {
        res.send(
          JSON.stringify({
            error: err,
            url:
              `${config.protocol}${config.ip}:${config.port}/files/` + fileName
          })
        );
        this.cachedTextStore[req.body.text] = {
          fileName,
          time: Date.now()
        };
      });
    });
  }
  private split(text: string): string[] {
    return text
      .replace(/[\.!?]/g, t => {
        return t + "|";
      })
      .split("|")
      .filter(string => {
        if (/[a-z|A-Z|0-9|А-Я|а-я]/.test(string)) {
          return true;
        }
      });
  }
  private createSpeechFile(textChunks: string[], cb: Function) {
    let id = Math.random()
      .toString()
      .substring(2);
    let fileName = "speechFile_" + id + "time_" + +Date.now() + ".wav";
    let i = 0;
    let idList: string[] = textChunks.map(() => {
      i++;
      return (
        "./files/id_" + id + "_time_" + +Date.now() + "_chunk_" + i + ".wav"
      );
    });
    let idListCopy: string[] = JSON.parse(JSON.stringify(idList));
    this.itararionLoadingChunk(textChunks, idList, () => {
      exec(
        `${config.soxPath} ${idListCopy.join(" ")} ${"./files/" + fileName}`,
        (err, stdout, stderr) => {
          cb(err);
        }
      );
      setTimeout(function() {
        idListCopy.forEach(item => {
          fs.unlink(item, () => {});
        });
      }, 30000);
    });
    return fileName;
  }
  private loadChunk(text: string, fileName: string, cb?: Function) {
    axios
      .get(
        "https://tts.voicetech.yandex.net/generate?" +
          "key=22fe10e2-aa2f-4a58-a934-54f2c1c4d908&" +
          "fornat=wav&" +
          "lang=ru-RU&" +
          "emotion=good&" +
          "speaker=alyss&" +
          "robot=1",
        {
          responseType: "arraybuffer",
          params: {
            text: text
          }
        }
      )
      .then((result: any) => {
        fs.writeFile(fileName, result.data, () => {
          if (typeof cb !== "undefined") {
            cb(result.data);
          }
        });
      });
  }
  private itararionLoadingChunk(
    textChunks: string[],
    idList: string[],
    cb: Function
  ) {
    let text = textChunks.shift();
    let id = idList.shift();
    if (typeof text !== "undefined" && typeof id !== "undefined") {
      this.loadChunk(text, id, () => {
        this.itararionLoadingChunk(textChunks, idList, cb);
      });
    } else {
      cb();
    }
  }
  private clearCacheServise() {
    for (let key in this.cachedTextStore) {
      this.cachedTextStore[key].fileName;
      fs.unlink(
        __dirname + "/files/" + this.cachedTextStore[key].fileName,
        e => {
          console.log(e);
        }
      );
      delete this.cachedTextStore[key];
    }
    setTimeout(() => {
      this.clearCacheServise();
    }, 604800000);
  }
}
new Api();
