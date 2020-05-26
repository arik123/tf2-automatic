import Bot from './Bot';
import log from '../lib/logger';

export = class PM2msg {
    private readonly bot: Bot;

    constructor(bot: Bot) {
        this.bot = bot;
    }

    processMessage(message): boolean {
        log.debug('message: ', message);
        if (!message.type) return false;
        const request: string = message.type; // expected format method:type (pricelist:get)
        if (!(typeof this[request] == 'function')) return false;
        log.debug(request);

        return this[request](message.data);
    }

    getPricelist(data: any) {
        const prices = this.bot.pricelist.getPrices();
        let ret = [];
        prices.forEach((price) => {
            ret.push(price.getJSON());
        });
        process.send({
            type: 'getPricelist',
            data: {
                ReqID: data.ReqID,
                pricelist: ret
            }
        });
        return true;
    }

    getInfo(data: any) {
        //@ts-ignore
        this.bot.community.getSteamUser(this.bot.community.client.toString(), (err, usr) => {
            if (err) log.error(err);
            const admins = this.bot.getAdmins();
            console.log(admins);
            process.send({
                type: 'getInfo',
                data: {
                    ReqID: data.ReqID,
                    name: usr.name,
                    avatar: usr.getAvatarURL(),
                    admins: admins.map(admin => admin.toString())
                }
            });
        });
        return true;
    }
}