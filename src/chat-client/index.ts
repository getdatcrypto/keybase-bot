import {spawn} from 'child_process'
import readline from 'readline'
import ClientBase from '../client-base'
import {formatAPIObjectOutput, formatAPIObjectInput} from '../utils'
import {
  ChatConversation,
  ChatChannel,
  ChatMessage,
  MessageSummary,
  ListenOptions,
  ReadResult,
  SendResult,
  ChatListOptions,
  ChatListChannelsOptions,
  ChatReadOptions,
  ChatSendOptions,
  ChatAttachOptions,
  ChatDownloadOptions,
  ChatDeleteOptions,
  ChatReactOptions,
  MessageNotification,
  UnfurlMode,
  FlipSummary,
} from './types'

/** A function to call when a message is received. */
export type OnMessage = (message: MessageSummary) => void | Promise<void>
/** A function to call when an error occurs. */
export type OnError = (error: Error) => void | Promise<void>

/** The chat module of your Keybase bot. For more info about the API this module uses, you may want to check out `keybase chat api`. */
class Chat extends ClientBase {
  /**
   * Lists your chats, with info on which ones have unread messages.
   * @memberof Chat
   * @param options - An object of options that can be passed to the method.
   * @returns - An array of chat conversations. If there are no conversations, the array is empty.
   * @example
   * bot.chat.list({unreadOnly: true}).then(chatConversations => console.log(chatConversations))
   */
  public async list(options?: ChatListOptions): Promise<ChatConversation[]> {
    await this._guardInitialized()
    const res = await this._runApiCommand({apiName: 'chat', method: 'list', options})
    if (!res) {
      throw new Error('Keybase chat list returned nothing.')
    }
    return res.conversations || []
  }

  /**
   * Lists conversation channels in a team
   * @memberof Chat
   * @param name - Name of the team
   * @param options - An object of options that can be passed to the method.
   * @returns - An array of chat conversations. If there are no conversations, the array is empty.
   * @example
   * bot.chat.listChannels('team_name').then(chatConversations => console.log(chatConversations))
   */
  public async listChannels(name: string, options?: ChatListChannelsOptions): Promise<ChatConversation[]> {
    await this._guardInitialized()
    const optionsWithDefaults = {
      ...options,
      name,
      membersType: options && options.membersType ? options.membersType : 'team',
    }
    const res = await this._runApiCommand({
      apiName: 'chat',
      method: 'listconvsonname',
      options: optionsWithDefaults,
    })
    if (!res) {
      throw new Error('Keybase chat list convs on name returned nothing.')
    }
    return res.conversations || []
  }

  /**
   * Reads the messages in a channel. You can read with or without marking as read.
   * @memberof Chat
   * @param channel - The chat channel to read messages in.
   * @param options - An object of options that can be passed to the method.
   * @returns - A summary of data about a message, including who send it, when, the content of the message, etc. If there are no messages in your channel, then an error is thrown.
   * @example
   * alice.chat.read(channel).then(messages => console.log(messages))
   */
  public async read(channel: ChatChannel, options?: ChatReadOptions): Promise<ReadResult> {
    await this._guardInitialized()
    const optionsWithDefaults = {
      ...options,
      channel,
      peek: options && options.peek ? options.peek : false,
      unreadOnly: options && options.unreadOnly !== undefined ? options.unreadOnly : false,
    }
    const res = await this._runApiCommand({apiName: 'chat', method: 'read', options: optionsWithDefaults})
    if (!res) {
      throw new Error('Keybase chat read returned nothing.')
    }
    // Pagination gets passed as-is, while the messages get cleaned up
    return {
      pagination: res.pagination,
      messages: res.messages.map((message: MessageNotification): MessageSummary => message.msg),
    }
  }

  /**
   * Joins a team conversation.
   * @param channel - The team chat channel to join.
   * @example
   * bot.chat.listConvsOnName('team_name').then(async teamConversations => {
   *  for (const conversation of teamConversations) {
   *    if (conversation.memberStatus !== 'active') {
   *      await bot.chat.join(conversation.channel)
   *      console.log('Joined team channel', conversation.channel)
   *    }
   *  }
   * })
   */
  public async joinChannel(channel: ChatChannel): Promise<void> {
    await this._guardInitialized()
    const res = await this._runApiCommand({
      apiName: 'chat',
      method: 'join',
      options: {
        channel,
      },
    })
    if (!res) {
      throw new Error('Keybase chat join returned nothing')
    }
  }

  /**
   * Leaves a team conversation.
   * @param channel - The team chat channel to leave.
   * @example
   * bot.chat.listConvsOnName('team_name').then(async teamConversations => {
   *  for (const conversation of teamConversations) {
   *    if (conversation.memberStatus === 'active') {
   *      await bot.chat.leave(conversation.channel)
   *      console.log('Left team channel', conversation.channel)
   *    }
   *  }
   * })
   */
  public async leaveChannel(channel: ChatChannel): Promise<void> {
    await this._guardInitialized()
    const res = await this._runApiCommand({
      apiName: 'chat',
      method: 'leave',
      options: {
        channel,
      },
    })
    if (!res) {
      throw new Error('Keybase chat leave returned nothing')
    }
  }

  /**
   * Send a message to a certain channel.
   * @memberof Chat
   * @param channel - The chat channel to send the message in.
   * @param message - The chat message to send.
   * @param options - An object of options that can be passed to the method.
   * @example
   * const channel = {name: 'kbot,' + bot.myInfo().username, public: false, topicType: 'chat'}
   * const message = {body: 'Hello kbot!'}
   * bot.chat.send(channel, message).then(() => console.log('message sent!'))
   */
  public async send(channel: ChatChannel, message: ChatMessage, options?: ChatSendOptions): Promise<SendResult> {
    await this._guardInitialized()
    const args = {
      ...options,
      channel,
      message,
    }
    this._adminDebugLogger.info(`sending message "${message.body}" in channel ${JSON.stringify(channel)}`)
    const res = await this._runApiCommand({
      apiName: 'chat',
      method: 'send',
      options: args,
    })
    if (!res) {
      throw new Error('Keybase chat send returned nothing')
    }
    this._adminDebugLogger.info(`message sent with id ${res.id}`)
    return {id: res.id}
  }

  /**
   * Creates a new blank conversation.
   * @memberof Chat
   * @param channel - The chat channel to create.
   * @example
   * bot.chat.createChannel(channel).then(() => console.log('conversation created'))
   */
  public async createChannel(channel: ChatChannel): Promise<void> {
    await this._guardInitialized()
    const args = {
      channel,
    }
    const res = await this._runApiCommand({
      apiName: 'chat',
      method: 'newconv',
      options: args,
    })
    if (!res) {
      throw new Error('Keybase chat newconv returned nothing')
    }
  }

  /**
   * Send a file to a channel.
   * @memberof Chat
   * @param channel - The chat channel to send the message in.
   * @param filename - The absolute path of the file to send.
   * @param options - An object of options that can be passed to the method.
   * @example
   * bot.chat.attach(channel, '/Users/nathan/my_picture.png').then(() => console.log('Sent a picture!'))
   */
  public async attach(channel: ChatChannel, filename: string, options?: ChatAttachOptions): Promise<SendResult> {
    await this._guardInitialized()
    const args = {...options, channel, filename}
    const res = await this._runApiCommand({apiName: 'chat', method: 'attach', options: args})
    if (!res) {
      throw new Error('Keybase chat attach returned nothing')
    }
    return {id: res.id}
  }

  /**
   * Download a file send via Keybase chat.
   * @memberof Chat
   * @param channel - The chat channel that the desired attacment to download is in.
   * @param messageId - The message id of the attached file.
   * @param output - The absolute path of where the file should be downloaded to.
   * @param options - An object of options that can be passed to the method
   * @example
   * bot.chat.download(channel, 325, '/Users/nathan/Downloads/file.png')
   */
  public async download(channel: ChatChannel, messageId: number, output: string, options?: ChatDownloadOptions): Promise<void> {
    await this._guardInitialized()
    const args = {...options, channel, messageId, output}
    const res = await this._runApiCommand({apiName: 'chat', method: 'download', options: args})
    if (!res) {
      throw new Error('Keybase chat download returned nothing')
    }
  }

  /**
   * Reacts to a given message in a channel. Messages have messageId's associated with
   * them, which you can learn in `bot.chat.read`.
   * @memberof Chat
   * @param channel - The chat channel to send the message in.
   * @param messageId - The id of the message to react to.
   * @param reaction - The reaction emoji, in colon form.
   * @param options - An object of options that can be passed to the method.
   * @example
   * bot.chat.react(channel, 314, ':+1:').then(() => console.log('Thumbs up!'))
   */
  public async react(channel: ChatChannel, messageId: number, reaction: string, options?: ChatReactOptions): Promise<SendResult> {
    await this._guardInitialized()
    const args = {
      ...options,
      channel,
      messageId,
      message: {body: reaction},
    }
    const res = await this._runApiCommand({apiName: 'chat', method: 'reaction', options: args})
    if (!res) {
      throw new Error('Keybase chat react returned nothing.')
    }

    return {id: res.id}
  }

  /**
   * Deletes a message in a channel. Messages have messageId's associated with
   * them, which you can learn in `bot.chat.read`. Known bug: the GUI has a cache,
   * and deleting from the CLI may not become apparent immediately.
   * @memberof Chat
   * @param channel - The chat channel to send the message in.
   * @param messageId - The id of the message to delete.
   * @param options - An object of options that can be passed to the method.
   * @example
   * bot.chat.delete(channel, 314).then(() => console.log('message deleted!'))
   */
  public async delete(channel: ChatChannel, messageId: number, options?: ChatDeleteOptions): Promise<void> {
    await this._guardInitialized()
    const args = {
      ...options,
      channel,
      messageId,
    }
    const res = await this._runApiCommand({apiName: 'chat', method: 'delete', options: args})
    if (!res) {
      throw new Error('Keybase chat delete returned nothing.')
    }
  }

  /**
   * Gets current unfurling settings
   * @example
   * bot.chat.getUnfurlSettings().then((mode) => console.log(mode))
   */
  public async getUnfurlSettings(): Promise<UnfurlMode> {
    await this._guardInitialized()
    const res = await this._runApiCommand({apiName: 'chat', method: 'getunfurlsettings', options: {}})
    if (!res) {
      throw new Error('Keybase chat get unfurl mode returned nothing.')
    }
    return res
  }

  /**
   * Sets the unfurling mode
   * In Keybase, unfurling means generating previews for links that you're sending
   * in chat messages. If the mode is set to always or the domain in the URL is
   * present on the whitelist, the Keybase service will automatically send a preview
   * to the message recipient in a background chat channel.
   * @param mode - the new unfurl mode
   * @example
   * bot.chat.setUnfurlMode({
   *   "mode": "always",
   * }).then((mode) => console.log('mode updated!'))
   */
  public async setUnfurlSettings(mode: UnfurlMode): Promise<void> {
    await this._guardInitialized()
    const res = await this._runApiCommand({apiName: 'chat', method: 'setunfurlsettings', options: mode})
    if (!res) {
      throw new Error('Keybase chat set unfurl mode returned nothing.')
    }
  }

  /**
   * Loads a flip's details
   * @param conversationID - conversation ID received in API listen.
   * @param flipConversationID - flipConvID from the message summary.
   * @param messageID - ID of the message in the conversation.
   * @param gameID - gameID from the flip message contents.
   * @example
   * // check demos/es7/poker-hands.js
   */
  public async loadFlip(conversationID: string, flipConversationID: string, messageID: number, gameID: string): Promise<FlipSummary> {
    await this._guardInitialized()
    const res = await this._runApiCommand({
      apiName: 'chat',
      method: 'loadflip',
      options: formatAPIObjectInput({conversationID, flipConversationID, messageID, gameID}, 'chat'),
      timeout: 2000,
    })
    if (!res) {
      throw new Error('Keybase chat load flip returned nothing.')
    }
    return res.status
  }

  /**
   * Listens for new chat messages on a specified channel. The `onMessage` function is called for every message your bot receives. This is pretty similar to `watchAllChannelsForNewMessages`, except it specifically checks one channel. Note that it receives messages your own bot posts, but from other devices. You can filter out your own messages by looking at a message's sender object.
   * Hides exploding messages by default.
   * @memberof Chat
   * @param channel - The chat channel to watch.
   * @param onMessage - A callback that is triggered on every message your bot receives.
   * @param onError - A callback that is triggered on any error that occurs while the method is executing.
   * @param options - Options for the listen method.
   * @example
   * // Reply to all messages between you and `kbot` with 'thanks!'
   * const channel = {name: 'kbot,' + bot.myInfo().username, public: false, topicType: 'chat'}
   * const onMessage = message => {
   *   const channel = message.channel
   *   bot.chat.send(channel, {body: 'thanks!!!'})
   * }
   * bot.chat.watchChannelForNewMessages(channel, onMessage)
   */
  public async watchChannelForNewMessages(
    channel: ChatChannel,
    onMessage: OnMessage,
    onError?: OnError,
    options?: ListenOptions
  ): Promise<void> {
    await this._guardInitialized()
    this._chatListen(onMessage, onError, channel, options)
  }

  /**
   * This function will put your bot into full-read mode, where it reads
   * everything it can and every new message it finds it will pass to you, so
   * you can do what you want with it. For example, if you want to write a
   * Keybase bot that talks shit at anyone who dares approach it, this is the
   * function to use. Note that it receives messages your own bot posts, but from other devices.
   * You can filter out your own messages by looking at a message's sender object.
   * Hides exploding messages by default.
   * @memberof Chat
   * @param onMessage - A callback that is triggered on every message your bot receives.
   * @param onError - A callback that is triggered on any error that occurs while the method is executing.
   * @param options - Options for the listen method.
   * @example
   * // Reply to incoming traffic on all channels with 'thanks!'
   * const onMessage = message => {
   *   const channel = message.channel
   *   bot.chat.send(channel, {body: 'thanks!!!'})
   * }
   * bot.chat.watchAllChannelsForNewMessages(onMessage)
   *
   */
  public async watchAllChannelsForNewMessages(onMessage: OnMessage, onError?: OnError, options?: ListenOptions): Promise<void> {
    await this._guardInitialized()
    this._chatListen(onMessage, onError, undefined, options)
  }

  /**
   * Spawns the chat listen process and handles the calling of onMessage, onError, and filtering for a specific channel.
   * @memberof Chat
   * @ignore
   * @param onMessage - A callback that is triggered on every message your bot receives.
   * @param onError - A callback that is triggered on any error that occurs while the method is executing.
   * @param channel - The chat channel to watch.
   * @param options - Options for the listen method.
   * @example
   * this._chatListen(onMessage, onError)
   */
  private _chatListen(onMessage: OnMessage, onError?: OnError, channel?: ChatChannel, options?: ListenOptions): void {
    const args = ['chat', 'api-listen']
    if (this.homeDir) {
      args.unshift('--home', this.homeDir)
    }
    if (!options || (options && options.hideExploding !== false)) {
      args.push('--hide-exploding')
    }
    if (options && options.showLocal === true) {
      args.push('--local')
    }
    if (channel) {
      args.push('--filter-channel', JSON.stringify(formatAPIObjectInput(channel, 'chat')))
    }
    const child = spawn(this._pathToKeybaseBinary(), args)
    this._spawnedProcesses.push(child)
    const cmdSample = this._pathToKeybaseBinary() + ' ' + args.join(' ')
    this._adminDebugLogger.info(`beginning listen on channel=${JSON.stringify(channel || 'ALL')} using ${cmdSample}`)
    child.on('error', (err: Error): void => {
      this._adminDebugLogger.error(`got listen error ${err.message}`)
    })
    child.on('exit', (): void => {
      this._adminDebugLogger.info(`got listen exit`)
    })
    child.on('close', (): void => {
      this._adminDebugLogger.info(`got listen close`)
    })
    child.on('disconnect', (): void => {
      this._adminDebugLogger.info(`got listen disconnect`)
    })
    const lineReaderStderr = readline.createInterface({input: child.stderr})
    lineReaderStderr.on('line', (line: string): void => {
      this._adminDebugLogger.error(`stderr from listener: ${line}`)
    })

    const lineReaderStdout = readline.createInterface({input: child.stdout})
    const onLine = (line: string): void => {
      this._adminDebugLogger.info(`stdout from listener: ${line}`)
      try {
        const messageObject: MessageNotification = formatAPIObjectOutput(JSON.parse(line))
        if (messageObject.hasOwnProperty('error')) {
          throw new Error(messageObject.error)
        } else if (
          // fire onMessage if it was from a different sender or at least a different device
          // from this sender. Bots can filter out their own messages from other devices.
          (options && options.showLocal) ||
          (this.username &&
            this.devicename &&
            (messageObject.msg.sender.username !== this.username.toLowerCase() || messageObject.msg.sender.deviceName !== this.devicename))
        ) {
          onMessage(messageObject.msg)
        }
      } catch (error) {
        if (onError) {
          onError(error)
        }
      }
    }
    lineReaderStdout.on('line', onLine)
  }
}

export default Chat
