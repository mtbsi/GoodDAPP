// @flow
import React from 'react'
import { StyleSheet } from 'react-native'
import { Wrapper, Title, Description } from './components'
import { normalize } from 'react-native-elements'
import { wrapFunction } from '../../lib/undux/utils/wrapper' // use for error handling
type Props = {
  screenProps: any
}
type State = {}
export default class FaceRecognition extends React.Component<Props, State> {
  handleSubmit = () => {
    // Show LivelinessCapture.tx UI.
    /*wrapFunction( // see in ReceieveByQR.web line 61 the usage.
      // ... 
    )*/
    // Show face reco client.
    this.props.screenProps.doneCallback({}) // call it when the face recognition is over successfully

    // if something fails
  }

  render() {
    return (
      <Wrapper valid={true} handleSubmit={this.handleSubmit} submitText="Quick face recognition">
        <Title>{`${this.props.screenProps.data.fullName},\n Just one last thing...`}</Title>
        <Description style={styles.description}>
          {"We want to give you a basic income every day, so we need to make sure it's you"}
        </Description>
      </Wrapper>
    )
  }
}

const styles = StyleSheet.create({
  description: {
    fontSize: normalize(20)
  }
})
