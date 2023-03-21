import ClientEvent from "../util/ClientEvent.js";
import QuestionHandler from "../util/QuestionHandler.js";
import Welcome from "../util/Welcome.js";
import { Member } from "oceanic.js";

export default new ClientEvent("guildMemberRemove", async function guildMemberRemoveEvent(member, guild) {
    if (!(member instanceof Member)) {
        return;
    }

    const serverConfig = await QuestionHandler.getServerConfig(guild.id);
    if (serverConfig.welcome !== null) {
        if (typeof serverConfig.welcome === "object" && (!serverConfig.welcome.leave || !serverConfig.welcome.requiredRoles.every(role => member.roles.includes(role)))) {
            return;
        }
        await Welcome.run(guild.id, member.id, "leave", typeof serverConfig.welcome === "object" ? serverConfig.welcome.force : false);
    }
});
