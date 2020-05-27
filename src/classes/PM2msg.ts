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
        const id = this.bot.community.steamID
        //@ts-ignore
        this.bot.client.getPersonas([id]).then((personasRepsonse) => {
            const userData = personasRepsonse.personas[id.toString()];
            const admins = this.bot.getAdmins();
            process.send({
                type: 'getInfo',
                data: {
                    ReqID: data.ReqID,
                    name: userData.player_name,
                    avatar: userData.avatar_url_icon,
                    admins: admins.map(admin => admin.toString())
                }
            });
        });
        return true;
    }
    removeItem(data: any) {
        log.debug(data);
        if (!data.sku) {
            process.send({
                type: 'removeItem',
                data: {
                    ReqID: data.ReqID,
                    err: 'No SKU specified!'
                }
            });
            return true;
        }
        this.bot.pricelist
            .removePrice(data.sku as string, true)
            .then(entry => {
                process.send({
                    type: 'removeItem',
                    data: {
                        ReqID: data.ReqID,
                        msg: 'Removed "' + entry.name + '".'
                    }
                });
            })
            .catch(err => {
                process.send({
                    type: 'removeItem',
                    data: {
                        ReqID: data.ReqID,
                        err: 'Failed to remove pricelist entry: ' + err.message
                    }
                });
            });
        return true;
    }

    updateItem(data: any) {
        if (!data.sku) {
            process.send({
                type: 'updateItem',
                data: {
                    ReqID: data.ReqID,
                    err: 'No SKU specified!'
                }
            });
            return true;
        }
        if (!this.bot.pricelist.hasPrice(data.sku as string)) {
            process.send({
                type: 'updateItem',
                data: {
                    ReqID: data.ReqID,
                    err: 'Item is not in the pricelist.'
                }
            });
            return;
        }
        const entryData = this.bot.pricelist.getPrice(data.sku as string, false).getJSON();

        delete entryData.time;
        delete data.time;

        // Update entry
        for (const property in data) {
            if (!Object.prototype.hasOwnProperty.call(data, property)) {
                continue;
            }

            entryData[property] = data[property];
        }

        this.bot.pricelist
            .updatePrice(entryData, true)
            .then(entry => {
                process.send({
                    type: 'updateItem',
                    data: {
                        ReqID: data.ReqID,
                        msg: 'Updated "' + entry.name + '".'
                    }
                });
            })
            .catch(err => {
                process.send({
                    type: 'updateItem',
                    data: {
                        ReqID: data.ReqID,
                        err: 'Failed to update pricelist entry: ' +
                            (err.body && err.body.message ? err.body.message : err.message)
                    }
                });
            });
    }
}