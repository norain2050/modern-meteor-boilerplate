import React, { PureComponent } from 'react'
import gql from 'graphql-tag'
import { graphql, compose } from 'react-apollo'

const chatSubscription = gql`
  subscription chatAdded {
    chatAdded {
      _id
      text
      userId
    }
  }
`

class ChatContainer extends PureComponent {
  handleSubmit = e => {
    e.preventDefault()
    this.props.addChat({ text: this.input.value })
    this.form.reset()
  }

  componentDidMount() {
    this.props.data.subscribeToMore({
      document: chatSubscription,
      updateQuery: (prev, { subscriptionData }) => {
        const newChat = subscriptionData.data.chatAdded
        if (prev.chats.find(i => i._id === newChat._id)) {
          return prev
        }
        return {
          ...prev,
          chats: [...prev.chats.filter(i => i._id !== null), newChat],
        }
      },
    })
  }

  render() {
    const { data: { loading, chats } } = this.props

    if (loading) return <div>loading...</div>

    return (
      <div>
        <ChatList chats={chats} />
        <form onSubmit={this.handleSubmit} ref={el => (this.form = el)}>
          <input type="text" ref={el => (this.input = el)} />
          <input type="submit" />
        </form>
      </div>
    )
  }
}

const ChatList = ({ chats }) => <ul>{chats.map(i => <ChatItem key={i._id} item={i} />)}</ul>

const ChatItem = ({ item }) => <li>{item.text}</li>

const fetchChats = gql`
  query Query {
    chats {
      _id
      text
      userId
    }
  }
`

const addChat = gql`
  mutation addChat($text: String!) {
    addChat(text: $text) {
      _id
      text
      userId
    }
  }
`

export default compose(
  graphql(fetchChats),
  graphql(addChat, {
    props: ({ ownProps, mutate }) => ({
      addChat: ({ text }) =>
        mutate({
          mutation: addChat,
          variables: { text },
          optimisticResponse: {
            __typename: 'Mutation',
            addChat: {
              __typename: 'Chat',
              _id: null,
              text,
              userId: null,
            },
          },
          update: (proxy, { data: { addChat } }) => {
            const data = proxy.readQuery({ query: fetchChats })
            // don't double add the chat
            if (!data.chats.find(i => i._id === addChat._id)) {
              data.chats.push(addChat)
            }
            proxy.writeQuery({ query: fetchChats, data })
          },
        }),
    }),
  }),
)(ChatContainer)
