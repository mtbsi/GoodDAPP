// @flow
/* eslint-disable no-unused-vars */

// libraries
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { RadioButton } from 'react-native-paper'
import { Platform, TouchableOpacity, View } from 'react-native'
import { get, mapValues, pick, startCase } from 'lodash'

import ModalDropdown from 'react-native-modal-dropdown'

// custom components
import { t } from '@lingui/macro'
import { Switch } from 'react-native-switch'

import { useDebounce } from 'use-debounce'
import Wrapper from '../common/layout/Wrapper'
import { Icon, Section, SvgXml, Text } from '../common'
import { LanguageContext } from '../../language/i18n'

// hooks
import useOnPress from '../../lib/hooks/useOnPress'
import { useNotificationsOptions } from '../../lib/notifications/hooks/useNotifications'
import useDeleteAccountDialog from '../../lib/hooks/useDeleteAccountDialog'
import { useDialog } from '../../lib/dialog/useDialog'
import useCountryFlag from '../../lib/hooks/useCountryFlag'

// utils
import { useUserStorage } from '../../lib/wallet/GoodWalletProvider'
import logger from '../../lib/logger/js-logger'
import { withStyles } from '../../lib/styles'
import { CLICK_DELETE_WALLET, fireEvent, PROFILE_PRIVACY } from '../../lib/analytics/analytics'
import { getDesignRelativeHeight, isSmallDevice } from '../../lib/utils/sizes'

// assets
import OptionsRow from '../profile/OptionsRow'
import Config from '../../config/config'
import { isWeb } from '../../lib/utils/platform'

// initialize child logger
const log = logger.child({ from: 'ProfilePrivacy' })

// privacy options
const privacyOptions = ['private', 'masked', 'public']
const tips = {
  private: t`Your details will not be visible.`,
  masked: t`Your details will be partially visible
  (e.g.: ****ple@***.com).`,
  public: t`Your details will be fully visible.`,
}

// fields to manage privacy of
const profileFields = ['mobile', 'email']
const titles = { mobile: t`Phone number`, email: t`Email` }

const PrivacyOption = ({ title, value, field, setPrivacy }) => {
  const handlePrivacyChange = useCallback(
    value => {
      setPrivacy(privacy => ({ ...privacy, [field]: value }))
    },
    [setPrivacy, field],
  )

  return (
    <RadioButton.Group onValueChange={handlePrivacyChange} value={value}>
      <OptionsRow title={title} />
    </RadioButton.Group>
  )
}
const supportedCountryCodes = ['US', 'GB', 'ES', 'AR', 'FR', 'IT', 'KR', 'BR', 'UA', 'TR', 'VN', 'CN', 'IN', 'ID']
type CountryCode = $ElementType<typeof supportedCountryCodes, number>

const countryCodeToLocale: { [key: CountryCode]: string } = {
  US: 'en',
  GB: 'en-gb',
  ES: 'es',
  AR: 'es-419',
  FR: 'fr',
  IT: 'it',
  KR: 'ko',
  BR: 'pt-br',
  UA: 'uk',
  TR: 'tr',
  VN: 'vi',
  CN: 'zh',
  IN: 'hi',
  ID: 'id',
}

const languageCustomLabels: { [key: CountryCode]: string } = {
  US: 'English-US',
  GB: 'English-UK',
  ES: 'Spanish',
  AR: 'Latin-Spanish',
  FR: 'French',
  IT: 'Italian',
  KR: 'Korean',
  DE: 'German',
  BR: 'Portuguese-Brazilian',
  UA: 'Ukrainian',
  TR: 'Turkish',
  VN: 'Vietnamese',
  CN: 'Chinese-Simplified',
  IN: 'Hindi',
  ID: 'Indonesian',
}

const getKeyByValue = (object, value) => {
  return Object.keys(object).find(key => object[key] === value)
}

const DropDownRowComponent = props => {
  const { containerStyles, textStyles, children } = props
  const { children: countryCode } = children.props
  const countryLabel = languageCustomLabels[countryCode] ?? 'Device Default'
  const countryFlag = useCountryFlag(countryCode)

  return (
    <TouchableOpacity {...containerStyles} onPress={props.onPress}>
      <>
        {countryFlag ? <SvgXml src={countryFlag} width="48" height="48" /> : null}
        <Text {...textStyles}> {countryLabel}</Text>
      </>
    </TouchableOpacity>
  )
}

const Settings = ({ screenProps, styles, theme, navigation }) => {
  const { navigate } = navigation
  const userStorage = useUserStorage()
  const { setLanguage, language: languageCode } = useContext(LanguageContext)
  const [countryCode, setCountryCode] = useState(getKeyByValue(countryCodeToLocale, languageCode))
  const countryFlag = useCountryFlag(countryCode)

  const { showErrorDialog } = useDialog()
  const showDeleteAccountDialog = useDeleteAccountDialog(showErrorDialog)

  const handleLanguageChange = useCallback(
    async code => {
      setCountryCode(code)
      const codeLocale = countryCodeToLocale[code]

      await setLanguage(codeLocale)
    },
    [languageCode, setLanguage],
  )

  const { from: wentFrom } = screenProps?.screenState || {}
  const onWentFromClaimProcessedRef = useRef(false)

  const onPermissionRequest = useCallback(() => ('Claim' === wentFrom ? { promptPopup: false } : {}), [wentFrom])

  const [allowed, switchOption] = useNotificationsOptions({
    navigate,
    onPermissionRequest,
  })

  const [initialPrivacy, setInitialPrivacy] = useState(() => {
    const profile = userStorage.getProfile()

    return mapValues(pick(profile, profileFields), 'privacy')
  })

  const [privacy, setPrivacy] = useState(initialPrivacy)
  const { showDialog } = useDialog()

  const handleSaveShowTips = useCallback(() => {
    showDialog({
      title: t`SETTINGS`,
      content: (
        <Section.Stack grow>
          {privacyOptions.map(field => (
            <Section key={field} style={styles.dialogTipItem}>
              <Text fontWeight="bold" fontSize={18} color="primary" textAlign="left">
                {startCase(field)}
              </Text>
              <Text textAlign="left">{tips[field]}</Text>
            </Section>
          ))}
        </Section.Stack>
      ),
      buttons: [
        {
          text: t`Ok`,
          onPress: dismiss => {
            dismiss()
          },
        },
      ],
    })
  }, [showDialog])

  const [debouncedPrivacy] = useDebounce(privacy, 500)

  useEffect(() => {
    const valuesToBeUpdated = profileFields.filter(field => debouncedPrivacy[field] !== initialPrivacy[field])

    if (!valuesToBeUpdated.length) {
      return
    }

    fireEvent(PROFILE_PRIVACY, {
      privacy: valuesToBeUpdated.map(k => debouncedPrivacy[k]),
      valuesToBeUpdated,
    })

    /* eslint-disable */
    Promise.all(
      valuesToBeUpdated.map(
        // update fields
        field => userStorage.setProfileFieldPrivacy(field, debouncedPrivacy[field]),
      ),
    )
      .then(() => setInitialPrivacy(debouncedPrivacy)) // resets initial privacy states with currently set values
      .catch(e => log.error('Failed to save new privacy', e.message, e))
    /* eslint-enable */
  }, [debouncedPrivacy, initialPrivacy, setInitialPrivacy, userStorage])

  useEffect(() => {
    if (true === onWentFromClaimProcessedRef.current || 'Claim' !== wentFrom) {
      return
    }

    switchOption(true)
    onWentFromClaimProcessedRef.current = true
  }, [switchOption, wentFrom])

  const handleDeleteAccount = useCallback(() => {
    fireEvent(CLICK_DELETE_WALLET)
    showDeleteAccountDialog()
  }, [showErrorDialog, showDeleteAccountDialog])

  return (
    <Wrapper style={styles.mainWrapper} withGradient={false}>
      <Section grow style={styles.wrapper}>
        <Section.Stack grow justifyContent="flex-start">
          {isWeb ? null : (
            <>
              <Section.Row justifyContent="center" style={styles.subtitleRow}>
                <Section.Text fontWeight="bold" color="gray">
                  {t`Notifications`}
                </Section.Text>
              </Section.Row>
              <Section.Row style={styles.switchRowContainer}>
                <Text>{t`Claim Reminders`}</Text>

                <Switch
                  value={allowed}
                  onValueChange={switchOption}
                  circleSize={16}
                  barHeight={20}
                  circleBorderWidth={0}
                  backgroundActive={'#0891B2'}
                  backgroundInactive={'#D4D4D4'}
                  circleActiveColor={'#fff'}
                  circleInActiveColor={'#fff'}
                  changeValueImmediately
                  renderActiveText={false}
                  renderInActiveText={false}
                  switchLeftPx={1.6}
                  switchRightPx={1.6}
                  switchWidthMultiplier={40 / 16}
                  switchBorderRadius={30}
                />
              </Section.Row>
            </>
          )}
          <Section.Row justifyContent="center" style={styles.subtitleRow}>
            <Section.Text fontWeight="bold" color="gray">
              {t`Manage your privacy settings`}
            </Section.Text>
            <InfoIcon style={styles.infoIcon} color={theme.colors.primary} onPress={handleSaveShowTips} />
          </Section.Row>
          <Section.Stack justifyContent="flex-start" style={styles.optionsRowContainer}>
            <OptionsRow />
            {profileFields.map(field => (
              <PrivacyOption
                key={field}
                field={field}
                title={titles[field]}
                value={privacy[field]}
                setPrivacy={setPrivacy}
              />
            ))}
          </Section.Stack>

          <Section.Row justifyContent="center" style={[styles.subtitleRow, { flexDirection: 'column' }]}>
            <Section.Text fontWeight="bold" color="gray">
              {t`Language`}
            </Section.Text>
            <Section.Stack justifyContent="flex-start" style={styles.selectLanguageContainer}>
              <Section.Row style={styles.languageRow}>
                <View style={styles.languageInputContainer}>
                  <ModalDropdown
                    defaultValue={languageCustomLabels[countryCode] ?? t`Select a language...`}
                    options={[isWeb ? '' : 'DD', ...supportedCountryCodes]} // empty string breaks on native
                    alignOptionsToRight={true}
                    saveScrollPosition={false}
                    showsVerticalScrollIndicator={true}
                    renderButtonText={option => {
                      const language = languageCustomLabels[option] ?? 'Device Default'
                      return t`${language}`
                    }}
                    renderRowComponent={DropDownRowComponent}
                    onSelect={(index, option) => {
                      handleLanguageChange(option)
                    }}
                    defaultTextStyle={{ fontSize: 18 }}
                    textStyle={{ marginLeft: 10, fontSize: 18 }}
                    buttonAndRightComponentContainerStyle={styles.dropDownContainer}
                    style={styles.modalDropDown}
                    renderRightComponent={() =>
                      countryCode ? (
                        <View style={styles.flagContainer}>
                          <SvgXml src={countryFlag} width="32" height="32" />
                        </View>
                      ) : null
                    }
                    renderButtonProps={{ style: styles.renderButtonProps }}
                    renderRowProps={{
                      countryFlag: countryFlag,
                      containerStyles: {
                        style: {
                          border: 'none',
                          alignItems: 'center',
                          justifyContent: 'flex-start',
                          flexDirection: 'row',
                          ...Platform.select({
                            web: {
                              width: '200',
                            },
                          }),
                        },
                      },
                      textStyles: {
                        style: {
                          paddingTop: 10,
                          paddingBottom: 10,
                          ...Platform.select({
                            web: {
                              width: '100%',
                            },
                          }),
                        },
                      },
                    }}
                  />
                </View>
              </Section.Row>
            </Section.Stack>
          </Section.Row>
          <Section.Row justifyContent="center">
            <TouchableOpacity onPress={handleDeleteAccount} style={styles.deleteAccountButton}>
              <Icon name="trash" size={16} color={theme.colors.red} />
              <Text color={theme.colors.red} style={{ marginLeft: 16 }}>
                Delete Account
              </Text>
            </TouchableOpacity>
          </Section.Row>
        </Section.Stack>
      </Section>
    </Wrapper>
  )
}

/**
 * InfoIcon component
 * @param {object} props
 * @param {string} props.color
 * @param {Function} props.onPress
 * @param {number} props.size
 * @returns {ReactNode}
 * @constructor
 */
const InfoIcon = ({ color, onPress, size, style }) => {
  const _onPress = useOnPress(onPress)
  return (
    <TouchableOpacity onPress={_onPress} style={style}>
      <Icon size={size || 16} color={color} name="faq" />
    </TouchableOpacity>
  )
}

const getStylesFromProps = ({ theme }) => {
  const wrapper = {
    paddingLeft: 0,
    paddingRight: 0,
    paddingBottom: getDesignRelativeHeight(10),
    marginBottom: theme.paddings.bottomPadding,
  }

  if (isSmallDevice) {
    wrapper.paddingBottom = getDesignRelativeHeight(3)
    wrapper.paddingTop = getDesignRelativeHeight(5)
  }

  return {
    wrapper,
    infoIcon: {
      marginLeft: 6,
    },
    optionsRowContainer: {
      padding: 0,
    },
    growOne: {
      flexGrow: 1,
    },
    growTen: {
      flexGrow: 10,
    },
    subtitleRow: {
      maxHeight: '16%',
      marginBottom: getDesignRelativeHeight(isSmallDevice ? 20 : 30),
      marginTop: theme.sizes.defaultQuadruple,
    },
    buttonsRow: {
      paddingHorizontal: theme.sizes.defaultDouble,
    },
    dialogTipItem: {
      alignItems: 'flex-start',
      paddingVertical: 10,
    },
    mainWrapper: {
      ...Platform.select({
        web: {
          backgroundImage: 'none',
          backgroundColor: 'none',
        },
        default: { backgroundColor: 'transparent' },
      }),
    },
    switchRowContainer: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      borderStyle: 'solid',
      borderBottomColor: theme.colors.lightGray,
      borderTopColor: theme.colors.lightGray,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      paddingVertical: theme.paddings.mainContainerPadding,
      paddingHorizontal: theme.sizes.defaultQuadruple,
      marginBottom: theme.sizes.defaultQuadruple,
    },
    flagContainer: {
      ...Platform.select({
        web: {
          width: 55,
          justifyContent: 'center',
          alignItems: 'center',
        },
        default: {
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          width: 40,
        },
      }),
      height: 45,
    },
    selectLanguageContainer: {
      marginTop: 15,
      flexDirection: 'column',
      width: 50,
      justifyContent: 'flex-start',
    },
    languageRow: {
      justifyContent: 'flex-start',
    },
    languageInputContainer: {
      ...Platform.select({
        web: {
          width: '70%',
        },
        native: {
          width: '120%',
        },
      }),
    },
    modalDropDown: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    renderButtonProps: {
      width: 160,
      justifyContent: 'center',
      alignItems: 'center',
    },
    dropDownContainer: {
      flexDirection: 'row-reverse',
    },
    deleteAccountButton: {
      justifyContent: 'center',
      marginTop: 100,
      flexDirection: 'row',
    },
  }
}

const settings = withStyles(getStylesFromProps)(Settings)

settings.navigationOptions = {
  title: 'SETTINGS',
}

export default settings
