/*
 * Copyright © 2018 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
    addressSlackChannelsFromContext,
    EventFired,
    EventHandler,
    failure,
    GraphQL,
    HandleEvent,
    HandlerContext,
    HandlerResult,
    logger,
    reduceResults,
    Success,
    Tags,
} from "@atomist/automation-client";

import * as graphql from "../typings/types";

@EventHandler("notify repo channels when there is a push", GraphQL.subscription("PushWithRepo"))
@Tags("push", "notification")
export class NotifyOnPush implements HandleEvent<graphql.PushWithRepo.Subscription> {

    public async handle(e: EventFired<graphql.PushWithRepo.Subscription>, ctx: HandlerContext): Promise<HandlerResult> {
        logger.debug(`incoming event is ${JSON.stringify(e.data)}`);

        try {
            const results = await Promise.all(e.data.Push.map(async p => {
                if (p.repo && p.repo.channels && p.repo.channels.length > 0) {
                    const dest = await addressSlackChannelsFromContext(ctx, ...p.repo.channels.map(c => c.name));
                    await ctx.messageClient.send(`Got a push with sha \`${p.after.sha}\``, dest);
                }
                return Success;
            }));
            return reduceResults(results);
        } catch (e) {
            return failure(e);
        }
    }
}
