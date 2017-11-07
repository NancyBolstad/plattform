import React, {PureComponent} from 'react'
import {Label, LSelect} from './Label'

export class NativeDropdown extends PureComponent {
  constructor (props) {
    super(props)

    this.state = {
      focus: false
    }

    this.onFocus = () => {
      this.setState({focus: true})
    }
    this.onBlur = () => {
      this.setState({focus: false})
    }
  }

  render () {
    const {label, items, value, onChange} = this.props
    const {focus} = this.state

    return (
      <Label top={true} focus={focus} text={label}>
        <LSelect value={value} onChange={onChange} onFocus={this.onFocus} onBlur={this.onBlur}>
          {items.map((item, index) => (
            <option key={index} value={item.value}>
              {item.text}
            </option>
          ))}
        </LSelect>
      </Label>
    )
  }
}

export default NativeDropdown
