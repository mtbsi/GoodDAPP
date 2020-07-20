import React, { useEffect } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { Appbar } from 'react-native-paper'

import Section from '../common/layout/Section'
import Icon from '../common/view/Icon'

import { getMaxDeviceHeight } from '../../lib/utils/Orientation'
import useLoadingIndicator from '../../lib/hooks/useLoadingIndicator'
import IframeManager from './iframe.manager'

const wHeight = getMaxDeviceHeight()

export const createIframe = (src, title, backToWallet = false, backToRoute = 'Home') => {
  const IframeTab = props => {
    const [showLoading, hideLoading] = useLoadingIndicator()

    useEffect(() => {
      showLoading()
      IframeManager.addListener(src, hideLoading)

      return () => IframeManager.removeListener(src, hideLoading)
    }, [])

    // this is for our external pages like privacy policy, etc.. they dont require iframeresizer to work ok on ios <13
    return (
      <iframe
        allowFullScreen
        title={title}
        seamless
        frameBorder="0"
        onLoad={hideLoading}
        src={src}
        width="100%"
        height="100%"
        style={{ height: wHeight }}
      />
    )
  }

  const navBarStyles = {
    wrapper: {
      position: 'relative',
    },
    title: {
      position: 'absolute',
      left: 0,
      right: 0,
      textTransform: 'uppercase',
    },
    walletIcon: {
      position: 'absolute',
      right: 15,
    },
  }

  if (backToWallet) {
    const NavigationBar = navigate => (
      <Appbar.Header dark style={navBarStyles.wrapper}>
        <View style={{ width: 48 }} />
        <Appbar.Content />
        <Section.Text color="white" fontWeight="medium" style={navBarStyles.title} testID="rewards_header">
          {title}
        </Section.Text>
        <Appbar.Content />
        <TouchableOpacity onPress={() => navigate(backToRoute)} style={navBarStyles.walletIcon}>
          <Icon name="wallet" size={36} color="white" />
        </TouchableOpacity>
      </Appbar.Header>
    )

    IframeTab.navigationOptions = ({ navigation }) => {
      return {
        navigationBar: () => NavigationBar(navigation.navigate),
      }
    }
  } else {
    IframeTab.navigationOptions = {
      title,
    }
  }
  return IframeTab
}
