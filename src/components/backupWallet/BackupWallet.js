// @flow
import React, { useEffect, useState } from 'react'
import normalize from 'react-native-elements/src/helpers/normalizeText'
import { useWrappedApi } from '../../lib/API/useWrappedApi'
import { withStyles } from '../../lib/styles'
import { useDialog } from '../../lib/undux/utils/dialog'
import { getMnemonics, getMnemonicsObject } from '../../lib/wallet/SoftwareWalletProvider'
import { CustomButton, Section, Text } from '../common'
import MnemonicInput from '../signin/MnemonicInput'

const TITLE = 'Backup my wallet'

type BackupWalletProps = {
  styles: {},
  theme: {}
}

const BackupWallet = ({ screenProps, styles, theme }: BackupWalletProps) => {
  const [showDialogWithData] = useDialog()
  const [mnemonics, setMnemonics] = useState('')
  const API = useWrappedApi()

  const getMnemonicsValue = async () => {
    const currentMnemonics = await getMnemonicsObject()
    setMnemonics(currentMnemonics)
  }

  useEffect(() => {
    getMnemonicsValue()
  }, [])

  const sendRecoveryEmail = async () => {
    const currentMnemonics = await getMnemonics()
    await API.sendRecoveryInstructionByEmail(currentMnemonics)
    showDialogWithData({
      title: 'Backup Your Wallet',
      message: 'We sent an email with recovery instructions for your wallet'
    })
  }

  return (
    <Section grow={5} style={styles.wrapper}>
      <Section.Text grow fontWeight="bold" fontSize={16} style={styles.instructions}>
        {`please save your 12-word pass phrase\nand keep it in a secure location\nso you can recover your wallet anytime`}
      </Section.Text>
      <Section.Stack grow={4} justifyContent="space-between" style={styles.inputsContainer}>
        <MnemonicInput recoveryMode={mnemonics} />
      </Section.Stack>
      <Section.Stack grow style={styles.bottomContainer} justifyContent="space-between">
        <Text color="primary" onPress={sendRecoveryEmail}>
          Resend backup email
        </Text>
        <CustomButton color={theme.colors.primary} onPress={screenProps.pop}>
          Done
        </CustomButton>
      </Section.Stack>
    </Section>
  )
}

const backupWalletStyles = ({ theme }) => ({
  wrapper: {
    borderRadius: 0
  },
  instructions: {
    marginVertical: normalize(theme.paddings.mainContainerPadding)
  },
  inputsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: normalize(theme.paddings.mainContainerPadding),
    marginHorizontal: normalize(theme.paddings.mainContainerPadding)
  },
  bottomContainer: {
    marginVertical: normalize(theme.paddings.mainContainerPadding)
  }
})

const backupWallet = withStyles(backupWalletStyles)(BackupWallet)

backupWallet.navigationOptions = {
  title: TITLE
}

export default backupWallet
